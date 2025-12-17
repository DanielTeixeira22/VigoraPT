import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  List,
  ListItem,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { listConversations, listMessages, sendMessage, ensureConversation } from '../../services/chat';
import { listMyClients, getMyClientProfile } from '../../services/clients';
import { getMyTrainerProfile, listPublicTrainers } from '../../services/trainers';
import { searchUsers } from '../../services/users';
import type { Conversation, Message, ClientProfile, TrainerProfile, User, UserProfile } from '../../types/domain';
import PageHeader from '../../components/ui/PageHeader';
import { formatDateTime } from '../../utils/date';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

// Helper types for populated user data
type PopulatedUserRef = { _id: string; username: string; email?: string; profile?: UserProfile };

const getUserDisplayName = (userRef: string | PopulatedUserRef | undefined): string => {
  if (!userRef) return 'Desconhecido';
  if (typeof userRef === 'string') return userRef;
  const name = `${userRef.profile?.firstName ?? ''} ${userRef.profile?.lastName ?? ''}`.trim();
  return name || userRef.username || 'Desconhecido';
};

const getUserId = (userRef: string | PopulatedUserRef | undefined): string => {
  if (!userRef) return '';
  if (typeof userRef === 'string') return userRef;
  return userRef._id;
};

interface ContactSuggestion {
  id: string;
  name: string;
  role: 'CLIENT' | 'TRAINER' | 'ADMIN';
  clientProfileId?: string;
  trainerProfileId?: string;
  userId: string;
}

const ChatPage = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { handleRemoteNotification } = useNotifications();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [content, setContent] = useState('');

  // Get current user's profile based on role
  const { data: clientProfile } = useQuery({
    queryKey: ['client', 'me', 'for-chat'],
    enabled: user?.role === 'CLIENT',
    queryFn: getMyClientProfile,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ['trainer', 'me', 'for-chat'],
    enabled: user?.role === 'TRAINER',
    queryFn: getMyTrainerProfile,
  });

  // Get data for contact suggestions based on role
  const { data: myClients } = useQuery({
    queryKey: ['clients', 'my', 'for-chat'],
    enabled: user?.role === 'TRAINER',
    queryFn: listMyClients,
  });

  const { data: publicTrainers } = useQuery({
    queryKey: ['trainers', 'public', 'for-chat'],
    enabled: user?.role === 'CLIENT',
    queryFn: () => listPublicTrainers({ limit: 50 }),
  });

  const { data: adminUsers } = useQuery({
    queryKey: ['users', 'admins', 'for-chat'],
    enabled: user?.role === 'TRAINER',
    queryFn: () => searchUsers({ role: 'ADMIN', limit: 50 }),
  });

  const { data: allTrainers } = useQuery({
    queryKey: ['users', 'trainers', 'for-chat'],
    enabled: user?.role === 'ADMIN',
    queryFn: () => searchUsers({ role: 'TRAINER', limit: 100 }),
  });

  const { data: allClients } = useQuery({
    queryKey: ['users', 'clients', 'for-chat'],
    enabled: user?.role === 'ADMIN',
    queryFn: () => searchUsers({ role: 'CLIENT', limit: 100 }),
  });

  // Conversations
  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => listConversations({ limit: 30 }),
    refetchInterval: 15000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chat', 'messages', selectedConversation?._id],
    enabled: Boolean(selectedConversation?._id),
    queryFn: () => (selectedConversation?._id ? listMessages(selectedConversation._id, { limit: 200 }) : Promise.resolve(null)),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const latest = messages?.items?.[messages.items.length - 1];
    if (latest && latest.senderId !== user?.id) {
      handleRemoteNotification({
        _id: latest._id,
        recipientId: user?.id || '',
        type: 'NEW_MESSAGE',
        payload: { conversationId: selectedConversation?._id },
        isRead: false,
      });
    }
  }, [handleRemoteNotification, messages, selectedConversation?._id, user?.id]);

  const sendMutation = useMutation({
    mutationFn: (payload: { conversationId: string; content: string }) => sendMessage(payload.conversationId, { content: payload.content }),
    onSuccess: () => {
      setContent('');
      void refetchMessages();
      void refetchConversations();
    },
    onError: () => toast({ title: 'Não foi possível enviar', status: 'error' }),
  });

  const startConversationMutation = useMutation({
    mutationFn: (payload: { clientId: string; trainerId: string; clientUserId: string; trainerUserId: string }) =>
      ensureConversation(payload),
    onSuccess: (conversation) => {
      setSelectedConversation(conversation);
      void refetchConversations();
      toast({ title: 'Conversa iniciada', status: 'success' });
    },
    onError: () => toast({ title: 'Erro ao iniciar conversa', status: 'error' }),
  });

  const sortedConversations = useMemo(
    () => conversations?.items?.sort((a, b) => (a.lastMessageAt && b.lastMessageAt ? b.lastMessageAt.localeCompare(a.lastMessageAt) : 0)) ?? [],
    [conversations]
  );

  // Build contact suggestions based on role
  const contactSuggestions = useMemo<ContactSuggestion[]>(() => {
    if (user?.role === 'CLIENT') {
      // Show the client's trainer
      if (clientProfile?.trainerId) {
        const trainer = publicTrainers?.items?.find((t) => t._id === clientProfile.trainerId);
        if (trainer) {
          return [{
            id: trainer._id!,
            name: getUserDisplayName(trainer.userId as PopulatedUserRef),
            role: 'TRAINER' as const,
            trainerProfileId: trainer._id,
            userId: getUserId(trainer.userId as PopulatedUserRef),
          }];
        }
      }
      return [];
    }

    if (user?.role === 'TRAINER') {
      const suggestions: ContactSuggestion[] = [];
      // Add all clients
      (myClients ?? []).forEach((c: ClientProfile) => {
        suggestions.push({
          id: c._id!,
          name: getUserDisplayName(c.userId as PopulatedUserRef),
          role: 'CLIENT' as const,
          clientProfileId: c._id,
          userId: getUserId(c.userId as PopulatedUserRef),
        });
      });
      // Add admins
      (adminUsers?.data ?? []).forEach((u: User) => {
        suggestions.push({
          id: u._id || u.id || '',
          name: `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.username,
          role: 'ADMIN' as const,
          userId: u._id || u.id || '',
        });
      });
      return suggestions;
    }

    if (user?.role === 'ADMIN') {
      const suggestions: ContactSuggestion[] = [];
      // Add trainers
      (allTrainers?.data ?? []).forEach((u: User) => {
        suggestions.push({
          id: u._id || u.id || '',
          name: `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.username,
          role: 'TRAINER' as const,
          userId: u._id || u.id || '',
        });
      });
      // Add clients
      (allClients?.data ?? []).forEach((u: User) => {
        suggestions.push({
          id: u._id || u.id || '',
          name: `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.username,
          role: 'CLIENT' as const,
          userId: u._id || u.id || '',
        });
      });
      return suggestions;
    }

    return [];
  }, [user?.role, clientProfile, publicTrainers, myClients, adminUsers, allTrainers, allClients]);

  const handleStartConversation = async (suggestion: ContactSuggestion) => {
    const currentUserId = user?._id || user?.id || '';
    
    // For CLIENT → TRAINER chat
    if (user?.role === 'CLIENT' && suggestion.role === 'TRAINER') {
      startConversationMutation.mutate({
        clientId: clientProfile?._id || '',
        trainerId: suggestion.trainerProfileId || '',
        clientUserId: currentUserId,
        trainerUserId: suggestion.userId,
      });
      return;
    }

    // For TRAINER → CLIENT chat
    if (user?.role === 'TRAINER' && suggestion.role === 'CLIENT') {
      startConversationMutation.mutate({
        clientId: suggestion.clientProfileId || '',
        trainerId: trainerProfile?._id || '',
        clientUserId: suggestion.userId,
        trainerUserId: currentUserId,
      });
      return;
    }

    // For other cases (TRAINER → ADMIN, ADMIN → anyone), we need a different approach
    // For now, show a message that this feature is coming
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'Chat com admins será disponibilizado em breve.',
      status: 'info',
    });
  };

  // Separate suggestions by role for ADMIN view
  const trainerSuggestions = contactSuggestions.filter((s) => s.role === 'TRAINER');
  const clientSuggestions = contactSuggestions.filter((s) => s.role === 'CLIENT');
  const adminSuggestions = contactSuggestions.filter((s) => s.role === 'ADMIN');

  return (
    <Box>
      <PageHeader title="Chat PT / Cliente" subtitle="Troca de mensagens e alertas rápidos." />

      <Flex gap={4} direction={{ base: 'column', lg: 'row' }}>
        <Card w={{ base: '100%', lg: '360px' }}>
          <CardBody>
            {/* Contact Suggestions */}
            <Heading size="sm" mb={3}>
              Sugestões de contacto
            </Heading>
            
            {user?.role === 'ADMIN' ? (
              // Admin view with separated categories
              <Box>
                {trainerSuggestions.length > 0 && (
                  <Box mb={3}>
                    <Text fontSize="xs" fontWeight={600} color="muted" textTransform="uppercase" mb={2}>
                      Trainers
                    </Text>
                    <List spacing={1}>
                      {trainerSuggestions.map((s) => (
                        <ListItem
                          key={s.id}
                          p={2}
                          borderRadius="8px"
                          cursor="pointer"
                          _hover={{ bg: 'rgba(51,183,158,0.1)' }}
                          onClick={() => handleStartConversation(s)}
                        >
                          <Flex align="center" gap={2}>
                            <Text fontSize="sm" fontWeight={600}>{s.name}</Text>
                            <Badge size="sm" colorScheme="purple">Trainer</Badge>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                {clientSuggestions.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight={600} color="muted" textTransform="uppercase" mb={2}>
                      Clientes
                    </Text>
                    <List spacing={1}>
                      {clientSuggestions.map((s) => (
                        <ListItem
                          key={s.id}
                          p={2}
                          borderRadius="8px"
                          cursor="pointer"
                          _hover={{ bg: 'rgba(51,183,158,0.1)' }}
                          onClick={() => handleStartConversation(s)}
                        >
                          <Flex align="center" gap={2}>
                            <Text fontSize="sm" fontWeight={600}>{s.name}</Text>
                            <Badge size="sm" colorScheme="blue">Cliente</Badge>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                {contactSuggestions.length === 0 && (
                  <Text fontSize="sm" color="muted">Sem sugestões disponíveis.</Text>
                )}
              </Box>
            ) : (
              // Regular view (CLIENT or TRAINER)
              <List spacing={1} mb={3}>
                {contactSuggestions.map((s) => (
                  <ListItem
                    key={s.id}
                    p={2}
                    borderRadius="8px"
                    cursor="pointer"
                    _hover={{ bg: 'rgba(51,183,158,0.1)' }}
                    onClick={() => handleStartConversation(s)}
                  >
                    <Flex align="center" gap={2}>
                      <Text fontSize="sm" fontWeight={600}>{s.name}</Text>
                      <Badge size="sm" colorScheme={s.role === 'TRAINER' ? 'purple' : s.role === 'ADMIN' ? 'red' : 'blue'}>
                        {s.role === 'TRAINER' ? 'Trainer' : s.role === 'ADMIN' ? 'Admin' : 'Cliente'}
                      </Badge>
                    </Flex>
                  </ListItem>
                ))}
                {contactSuggestions.length === 0 && (
                  <Text fontSize="sm" color="muted">
                    {user?.role === 'CLIENT' ? 'Ainda não tens um treinador atribuído.' : 'Sem sugestões disponíveis.'}
                  </Text>
                )}
              </List>
            )}

            <Divider my={4} />

            {/* Existing Conversations */}
            <Text fontWeight={700} mb={3}>
              Conversas
            </Text>
            <List spacing={2}>
              {sortedConversations.map((c) => (
                <ListItem
                  key={c._id}
                  border="1px solid"
                  borderColor={selectedConversation?._id === c._id ? 'brand.400' : 'border'}
                  borderRadius="10px"
                  p={3}
                  cursor="pointer"
                  onClick={() => setSelectedConversation(c)}
                  bg={selectedConversation?._id === c._id ? 'rgba(51,183,158,0.08)' : 'card'}
                >
                  <Text fontWeight={700}>Conversa</Text>
                  <Text fontSize="sm" color="muted">
                    {c.lastMessageText || 'Sem mensagens'}
                  </Text>
                  {c.lastMessageAt && (
                    <Text fontSize="xs" color="muted">
                      {formatDateTime(c.lastMessageAt)}
                    </Text>
                  )}
                </ListItem>
              ))}
              {(sortedConversations.length ?? 0) === 0 && <Text color="muted">Nenhuma conversa disponível.</Text>}
            </List>
          </CardBody>
        </Card>

        <Card flex="1">
          <CardBody>
            <Text fontWeight={700} mb={3}>
              Mensagens
            </Text>
            <Box border="1px solid" borderColor="border" borderRadius="12px" p={3} minH="320px" maxH="480px" overflowY="auto">
              <Stack spacing={3}>
                {messages?.items?.map((m: Message) => (
                  <Box
                    key={m._id}
                    alignSelf={m.senderId === (user?._id || user?.id) ? 'flex-end' : 'flex-start'}
                    bg={m.senderId === (user?._id || user?.id) ? 'brand.500' : 'gray.100'}
                    _dark={m.senderId !== (user?._id || user?.id) ? { bg: 'gray.600' } : undefined}
                    color={m.senderId === (user?._id || user?.id) ? 'white' : 'inherit'}
                    px={3}
                    py={2}
                    borderRadius="12px"
                    maxW="80%"
                  >
                    <Text>{m.content}</Text>
                    <Text fontSize="xs" opacity={0.8}>
                      {m.createdAt ? formatDateTime(m.createdAt, 'HH:mm') : ''}
                    </Text>
                  </Box>
                ))}
                {(messages?.items?.length ?? 0) === 0 && <Text color="muted">Seleciona uma conversa para ver mensagens.</Text>}
              </Stack>
            </Box>

            <Flex mt={4} as="form" gap={3} onSubmit={(e) => e.preventDefault()}>
              <Textarea
                placeholder="Escreve uma mensagem..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                resize="vertical"
              />
              <Button
                onClick={() => selectedConversation?._id && sendMutation.mutate({ conversationId: selectedConversation._id, content })}
                isDisabled={!selectedConversation || !content.trim()}
                isLoading={sendMutation.isPending}
              >
                Enviar
              </Button>
            </Flex>
          </CardBody>
        </Card>
      </Flex>
    </Box>
  );
};

export default ChatPage;
