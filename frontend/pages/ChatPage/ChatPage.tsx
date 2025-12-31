// Chat page with conversations and real-time messages.
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useRef } from 'react';
import { FiMessageCircle, FiSend, FiUsers, FiSearch } from 'react-icons/fi';
import { listConversations, listMessages, sendMessage, ensureConversation } from '../../services/chat';
import { listMyClients, getMyClientProfile } from '../../services/clients';
import { getMyTrainerProfile, listPublicTrainers } from '../../services/trainers';
import { searchUsers } from '../../services/users';
import type { Conversation, Message, ClientProfile, User, UserProfile } from '../../types/domain';
import PageHeader from '../../components/ui/PageHeader';
import { formatDateTime } from '../../utils/date';
import { resolveBackendUrl } from '../../utils/url';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Helper type for backend-populated users.
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

const getUserAvatar = (userRef: string | PopulatedUserRef | undefined): string | undefined => {
  if (!userRef || typeof userRef === 'string') return undefined;
  return resolveBackendUrl(userRef.profile?.avatarUrl);
};

interface ContactSuggestion {
  id: string;
  name: string;
  role: 'CLIENT' | 'TRAINER' | 'ADMIN';
  clientProfileId?: string;
  trainerProfileId?: string;
  userId: string;
  avatarUrl?: string;
}

const ChatPage = () => {
  const toast = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [content, setContent] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure the list starts at the bottom on mount.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Profiles needed to map client/trainer relations.
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

  // Contact sources for suggestions based on role.
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

  // Main user conversations.
  const { refetch: refetchConversations } = useQuery({
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

  // Liga/desliga eventos de socket para receber mensagens em tempo real.
  useEffect(() => {
    if (!socket || !selectedConversation?._id) return;

    // Join the conversation room to receive updates.
    socket.emit('join:conversation', selectedConversation._id);

    const handleNewMessage = (msg: Message) => {
      // Refetch messages when a new one arrives in the active conversation.
      if (msg.conversationId === selectedConversation._id) {
        void refetchMessages();
      }
    };

    socket.on('chat:message', handleNewMessage);

    return () => {
      socket.emit('leave:conversation', selectedConversation._id);
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket, selectedConversation?._id, refetchMessages]);

  // Keep scroll at the bottom when messages change.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.items?.length]);

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
    },
    onError: () => toast({ title: 'Erro ao iniciar conversa', status: 'error' }),
  });
  // Build contact suggestions based on the authenticated role.
  const contactSuggestions = useMemo<ContactSuggestion[]>(() => {
    if (user?.role === 'CLIENT') {
      if (clientProfile?.trainerId) {
        const trainer = publicTrainers?.items?.find((t) => t._id === clientProfile.trainerId);
        if (trainer) {
          return [{
            id: trainer._id!,
            name: getUserDisplayName(trainer.userId as PopulatedUserRef),
            role: 'TRAINER' as const,
            trainerProfileId: trainer._id,
            userId: getUserId(trainer.userId as PopulatedUserRef),
            avatarUrl: getUserAvatar(trainer.userId as PopulatedUserRef),
          }];
        }
      }
      return [];
    }

    if (user?.role === 'TRAINER') {
      const suggestions: ContactSuggestion[] = [];
      (myClients ?? []).forEach((c: ClientProfile) => {
        suggestions.push({
          id: c._id!,
          name: getUserDisplayName(c.userId as PopulatedUserRef),
          role: 'CLIENT' as const,
          clientProfileId: c._id,
          userId: getUserId(c.userId as PopulatedUserRef),
          avatarUrl: getUserAvatar(c.userId as PopulatedUserRef),
        });
      });
      (adminUsers?.data ?? []).forEach((u: User) => {
        suggestions.push({
          id: u._id || u.id || '',
          name: `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.username,
          role: 'ADMIN' as const,
          userId: u._id || u.id || '',
          avatarUrl: resolveBackendUrl(u.profile.avatarUrl),
        });
      });
      return suggestions;
    }

    if (user?.role === 'ADMIN') {
      const suggestions: ContactSuggestion[] = [];
      (allTrainers?.data ?? []).forEach((u: User) => {
        suggestions.push({
          id: u._id || u.id || '',
          name: `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.username,
          role: 'TRAINER' as const,
          userId: u._id || u.id || '',
          avatarUrl: resolveBackendUrl(u.profile.avatarUrl),
        });
      });
      (allClients?.data ?? []).forEach((u: User) => {
        suggestions.push({
          id: u._id || u.id || '',
          name: `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.username,
          role: 'CLIENT' as const,
          userId: u._id || u.id || '',
          avatarUrl: resolveBackendUrl(u.profile.avatarUrl),
        });
      });
      return suggestions;
    }

    return [];
  }, [user?.role, clientProfile, publicTrainers, myClients, adminUsers, allTrainers, allClients]);

  // Filter suggestions by search term.
  const filteredSuggestions = useMemo(() => {
    if (!searchContact) return contactSuggestions;
    const term = searchContact.toLowerCase();
    return contactSuggestions.filter(s => s.name.toLowerCase().includes(term));
  }, [contactSuggestions, searchContact]);

  const handleStartConversation = async (suggestion: ContactSuggestion) => {
    const currentUserId = user?._id || user?.id || '';
    
    if (user?.role === 'CLIENT' && suggestion.role === 'TRAINER') {
      startConversationMutation.mutate({
        clientId: clientProfile?._id || '',
        trainerId: suggestion.trainerProfileId || '',
        clientUserId: currentUserId,
        trainerUserId: suggestion.userId,
      });
      return;
    }

    if (user?.role === 'TRAINER' && suggestion.role === 'CLIENT') {
      startConversationMutation.mutate({
        clientId: suggestion.clientProfileId || '',
        trainerId: trainerProfile?._id || '',
        clientUserId: suggestion.userId,
        trainerUserId: currentUserId,
      });
      return;
    }

    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'Chat com admins será disponibilizado em breve.',
      status: 'info',
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && selectedConversation?._id && content.trim()) {
      e.preventDefault();
      sendMutation.mutate({ conversationId: selectedConversation._id, content });
    }
  };

  // Group suggestions by role for rendering.
  const trainerSuggestions = filteredSuggestions.filter((s) => s.role === 'TRAINER');
  const clientSuggestions = filteredSuggestions.filter((s) => s.role === 'CLIENT');

  const renderContactItem = (s: ContactSuggestion) => (
    <ListItem
      key={s.id}
      p={3}
      borderRadius="12px"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ bg: 'brand.50', _dark: { bg: 'whiteAlpha.100' } }}
      onClick={() => handleStartConversation(s)}
    >
      <HStack spacing={3}>
        <Avatar size="sm" name={s.name} src={s.avatarUrl} />
        <VStack align="start" spacing={0} flex={1}>
          <Text fontSize="sm" fontWeight={600} noOfLines={1}>{s.name}</Text>
          <Badge 
            size="sm" 
            colorScheme={s.role === 'TRAINER' ? 'purple' : s.role === 'ADMIN' ? 'red' : 'blue'}
            variant="subtle"
            fontSize="10px"
          >
            {s.role === 'TRAINER' ? 'Treinador' : s.role === 'ADMIN' ? 'Admin' : 'Cliente'}
          </Badge>
        </VStack>
      </HStack>
    </ListItem>
  );

  return (
    <Box>
      <PageHeader 
        title="Chat" 
        subtitle="Comunica diretamente com os teus contactos." 
      />

      <Flex gap={5} direction={{ base: 'column', lg: 'row' }} h={{ lg: 'calc(100vh - 200px)' }} minH="600px">
        {/* Sidebar */}
        <Box 
          w={{ base: '100%', lg: '340px' }} 
          bg="card" 
          border="1px solid" 
          borderColor="border" 
          borderRadius="16px"
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          {/* Search */}
          <Box p={4} borderBottom="1px solid" borderColor="border">
            <InputGroup size="sm">
              <Input
                placeholder="Pesquisar contactos..."
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                borderRadius="10px"
                bg="white"
                _dark={{ bg: 'gray.800' }}
              />
              <InputRightElement>
                <Icon as={FiSearch} color="gray.400" />
              </InputRightElement>
            </InputGroup>
          </Box>

          {/* Contact suggestions */}
          <Box p={4} flex="1" overflowY="auto">
            <HStack mb={3}>
              <Icon as={FiUsers} color="brand.500" />
              <Heading size="xs" color="gray.600" _dark={{ color: 'gray.300' }}>
                Contactos
              </Heading>
            </HStack>
            
            {user?.role === 'ADMIN' ? (
              <Box>
                {trainerSuggestions.length > 0 && (
                  <Box mb={2}>
                    <Text fontSize="xs" fontWeight={600} color="gray.400" mb={1}>TRAINERS</Text>
                    <List spacing={1}>{trainerSuggestions.map(renderContactItem)}</List>
                  </Box>
                )}
                {clientSuggestions.length > 0 && (
                  <Box>
                    <Text fontSize="xs" fontWeight={600} color="gray.400" mb={1}>CLIENTES</Text>
                    <List spacing={1}>{clientSuggestions.map(renderContactItem)}</List>
                  </Box>
                )}
              </Box>
            ) : (
              <List spacing={1}>
                {filteredSuggestions.map(renderContactItem)}
                {filteredSuggestions.length === 0 && (
                  <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>
                    {user?.role === 'CLIENT' ? 'Ainda não tens um treinador atribuído.' : 'Sem contactos disponíveis.'}
                  </Text>
                )}
              </List>
            )}
          </Box>
        </Box>

        {/* Messages area */}
        <Box 
          flex="1" 
          bg="card" 
          border="1px solid" 
          borderColor="border" 
          borderRadius="16px"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          {/* Header */}
          <Box p={4} borderBottom="1px solid" borderColor="border">
            <HStack>
              <Icon as={FiMessageCircle} color="brand.500" />
              <Heading size="sm">Mensagens</Heading>
            </HStack>
          </Box>

          {/* Mensagens */}
          <Box flex="1" p={4} overflowY="auto" bg="gray.50" _dark={{ bg: 'gray.900' }}>
            <Stack spacing={3}>
              {messages?.items?.map((m: Message) => {
                const isOwn = m.senderId === (user?._id || user?.id);
                return (
                  <Flex key={m._id} justify={isOwn ? 'flex-end' : 'flex-start'}>
                    <Box
                      bg={isOwn ? 'brand.500' : 'white'}
                      _dark={{ bg: isOwn ? 'brand.500' : 'gray.700' }}
                      color={isOwn ? 'white' : 'inherit'}
                      px={4}
                      py={2}
                      borderRadius={isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px'}
                      maxW="75%"
                      boxShadow="sm"
                    >
                      <Text fontSize="sm">{m.content}</Text>
                      <Text fontSize="10px" opacity={0.7} textAlign="right" mt={1}>
                        {m.createdAt ? formatDateTime(m.createdAt, 'HH:mm') : ''}
                      </Text>
                    </Box>
                  </Flex>
                );
              })}
              {(messages?.items?.length ?? 0) === 0 && (
                <Flex direction="column" align="center" justify="center" h="100%" py={16} color="gray.400">
                  <Icon as={FiMessageCircle} boxSize={12} mb={4} />
                  <Text fontWeight={500}>Seleciona uma conversa</Text>
                  <Text fontSize="sm">As mensagens aparecerão aqui</Text>
                </Flex>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          {/* Entrada */}
          <Box p={4} borderTop="1px solid" borderColor="border">
            <HStack spacing={3}>
              <Input
                placeholder="Escreve uma mensagem..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyPress={handleKeyPress}
                borderRadius="full"
                bg="white"
                _dark={{ bg: 'gray.800' }}
                isDisabled={!selectedConversation}
              />
              <Button
                colorScheme="brand"
                borderRadius="full"
                px={6}
                leftIcon={<Icon as={FiSend} />}
                onClick={() => selectedConversation?._id && sendMutation.mutate({ conversationId: selectedConversation._id, content })}
                isDisabled={!selectedConversation || !content.trim()}
                isLoading={sendMutation.isPending}
              >
                Enviar
              </Button>
            </HStack>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
};

export default ChatPage;
