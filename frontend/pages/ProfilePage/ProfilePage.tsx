import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Progress,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { changePassword, getMe, updateMe } from '../../services/users';
import { uploadFile } from '../../services/uploads';
import { getMyTrainerProfile, listPublicTrainers } from '../../services/trainers';
import { getMyClientProfile } from '../../services/clients';
import { createTrainerChangeRequest, listTrainerChangeRequests } from '../../services/trainerChange';
import type { AxiosError } from 'axios';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';

const ProfilePage = () => {
  const toast = useToast();
  const { user, refreshSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [local, setLocal] = useState({
    email: user?.email ?? '',
    firstName: user?.profile.firstName ?? '',
    lastName: user?.profile.lastName ?? '',
    avatarUrl: user?.profile.avatarUrl ?? '',
    bio: user?.profile.bio ?? '',
  });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [changeRequest, setChangeRequest] = useState({ trainerId: '', reason: '' });

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ['trainer', 'me'],
    enabled: user?.role === 'TRAINER',
    queryFn: getMyTrainerProfile,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['client', 'me'],
    enabled: user?.role === 'CLIENT',
    queryFn: getMyClientProfile,
  });

  const { data: trainerOptions } = useQuery({
    queryKey: ['trainers', 'public', 'for-change'],
    enabled: user?.role === 'CLIENT',
    queryFn: () => listPublicTrainers({ limit: 50, sort: 'rating' }),
  });

  const { data: pendingRequest, refetch: refetchPendingRequest } = useQuery({
    queryKey: ['trainer-change-requests', 'my-pending'],
    enabled: user?.role === 'CLIENT',
    queryFn: () => listTrainerChangeRequests('PENDING'),
    select: (data) => data.find((r) => {
      const clientId = typeof r.clientId === 'object' ? r.clientId : r.clientId;
      return clientProfile?._id && clientId === clientProfile._id;
    }),
  });

  const changeTrainerMutation = useMutation({
    mutationFn: (payload: { requestedTrainerId: string; reason?: string }) => createTrainerChangeRequest(payload),
    onSuccess: () => {
      toast({ title: 'Pedido enviado', description: 'Aguarda decisão do administrador.', status: 'success' });
      setChangeRequest({ trainerId: '', reason: '' });
      refetchPendingRequest();
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const message = axiosErr.response?.data?.message ?? (err instanceof Error ? err.message : 'Ocorreu um erro');
      toast({
        title: 'Erro ao enviar pedido',
        description: message,
        status: 'error',
      });
    },
  });

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      toast({ title: 'Perfil atualizado', status: 'success' });
      refreshSession();
    },
    onError: () => toast({ title: 'Erro ao atualizar perfil', status: 'error' }),
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: passwords.current, newPassword: passwords.next }),
    onSuccess: () => {
      toast({ title: 'Password alterada', status: 'success' });
      setPasswords({ current: '', next: '' });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao alterar password',
        description: err instanceof Error ? err.message : 'Ocorreu um erro',
        status: 'error',
      }),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de ficheiro
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Por favor seleciona uma imagem', status: 'warning' });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande (máximo 5MB)', status: 'warning' });
      return;
    }

    setAvatarUploading(true);
    setUploadProgress(0);

    try {
      const asset = await uploadFile(file, {
        purpose: 'PROFILE',
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });
      setLocal({ ...local, avatarUrl: asset.url });
      toast({ title: 'Avatar carregado!', status: 'success' });
    } catch {
      toast({ title: 'Erro ao carregar avatar', status: 'error' });
    } finally {
      setAvatarUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box>
      <PageHeader title="Perfil" subtitle="Dados pessoais, avatar e bio." />

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        <GridItem>
          <Card>
            <CardBody>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate(local);
                }}
              >
                <Stack spacing={4}>
                  {/* Avatar Upload */}
                  <FormControl>
                    <FormLabel>Avatar</FormLabel>
                    <HStack spacing={4}>
                      <Avatar
                        size="xl"
                        name={`${local.firstName} ${local.lastName}`}
                        src={local.avatarUrl}
                        bg="brand.400"
                        color="white"
                      />
                      <Box>
                        <Input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleAvatarChange}
                          display="none"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          isLoading={avatarUploading}
                          loadingText="A carregar..."
                        >
                          Escolher imagem
                        </Button>
                        {avatarUploading && (
                          <Progress
                            value={uploadProgress}
                            size="xs"
                            colorScheme="brand"
                            mt={2}
                            borderRadius="full"
                          />
                        )}
                        <Text fontSize="xs" color="muted" mt={1}>
                          JPG, PNG ou GIF (máx. 5MB)
                        </Text>
                      </Box>
                    </HStack>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input value={local.email} onChange={(e) => setLocal({ ...local, email: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Primeiro nome</FormLabel>
                    <Input value={local.firstName} onChange={(e) => setLocal({ ...local, firstName: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Apelido</FormLabel>
                    <Input value={local.lastName} onChange={(e) => setLocal({ ...local, lastName: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Bio</FormLabel>
                    <Textarea value={local.bio} onChange={(e) => setLocal({ ...local, bio: e.target.value })} />
                  </FormControl>
                  <Button type="submit" isLoading={mutation.isPending}>
                    Guardar
                  </Button>
                </Stack>
              </form>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody>
              <Heading size="sm" mb={2}>
                Estado da conta
              </Heading>
              <Text fontSize="sm" color="muted">
                Role: {user?.role}
              </Text>
              <Text fontSize="sm" color="muted">
                Username: {freshUser?.username}
              </Text>
              {user?.role === 'TRAINER' && (
                <Box mt={3}>
                  <Text fontWeight={700}>Perfil de treinador</Text>
                  <Text fontSize="sm" color="muted">
                    Validado: {trainerProfile?.validatedByAdmin ? 'Sim' : 'Não'}
                  </Text>
                  <Text fontSize="sm" color="muted">
                    Especialidades: {trainerProfile?.specialties?.join(', ') || 'n/d'}
                  </Text>
                </Box>
              )}
              {user?.role === 'CLIENT' && (
                <Box mt={3}>
                  <Text fontWeight={700}>Perfil de cliente</Text>
                  <Text fontSize="sm" color="muted">
                    Objetivos: {clientProfile?.goals || 'n/d'}
                  </Text>
                  <Text fontSize="sm" color="muted">
                    Preferências: {clientProfile?.preferences || 'n/d'}
                  </Text>
                  <Box mt={3} p={3} border="1px solid" borderColor="border" borderRadius="10px">
                    <Text fontWeight={700}>Pedir alteração de treinador</Text>
                    <Text fontSize="sm" color="muted">
                      Escolhe um treinador validado e envia o pedido ao administrador.
                    </Text>
                    {(trainerOptions?.items?.length ?? 0) === 0 && (
                      <Text fontSize="sm" color="orange.400" mt={1}>
                        Ainda não há personal trainers validados disponíveis.
                      </Text>
                    )}
                    {pendingRequest && (
                      <Box mt={2} p={2} bg="yellow.50" _dark={{ bg: 'yellow.900' }} borderRadius="8px">
                        <Text fontSize="sm" color="yellow.600" _dark={{ color: 'yellow.300' }}>
                          ⏳ Já tens um pedido de mudança pendente. Aguarda a decisão do administrador.
                        </Text>
                      </Box>
                    )}
                    <Stack spacing={3} mt={2}>
                      <FormControl isRequired>
                        <FormLabel>Novo treinador</FormLabel>
                        <Select
                          placeholder="Seleciona"
                          value={changeRequest.trainerId}
                          onChange={(e) => setChangeRequest({ ...changeRequest, trainerId: e.target.value })}
                          isDisabled={(trainerOptions?.items?.length ?? 0) === 0}
                        >
                          {(trainerOptions?.items ?? []).map((t) => {
                            const userRef = t.userId as { profile?: { firstName?: string; lastName?: string }; username?: string } | string;
                            const name =
                              typeof userRef === 'object'
                                ? `${userRef.profile?.firstName ?? ''} ${userRef.profile?.lastName ?? ''}`.trim() || userRef.username || 'Trainer'
                                : userRef;
                            return (
                              <option key={t._id} value={t._id}>
                                {name} {t.certification ? `· ${t.certification}` : ''}
                              </option>
                            );
                          })}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Motivo</FormLabel>
                        <Textarea
                          value={changeRequest.reason}
                          onChange={(e) => setChangeRequest({ ...changeRequest, reason: e.target.value })}
                        />
                      </FormControl>
                      <Button
                        size="sm"
                        onClick={() =>
                          changeTrainerMutation.mutate({
                            requestedTrainerId: changeRequest.trainerId,
                            reason: changeRequest.reason || undefined,
                          })
                        }
                        isDisabled={!changeRequest.trainerId || (trainerOptions?.items?.length ?? 0) === 0 || !!pendingRequest}
                        isLoading={changeTrainerMutation.isPending}
                      >
                        Enviar pedido
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}
              <Box mt={4} p={3} border="1px dashed" borderColor="border" borderRadius="10px">
                <Text fontWeight={700}>Alteração de password</Text>
                <Stack spacing={3} mt={2}>
                  <FormControl isRequired>
                    <FormLabel>Password atual</FormLabel>
                    <Input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Nova password</FormLabel>
                    <Input
                      type="password"
                      value={passwords.next}
                      onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                    />
                  </FormControl>
                  <Button
                    size="sm"
                    onClick={() => passwordMutation.mutate()}
                    isLoading={passwordMutation.isPending}
                    isDisabled={!passwords.current || !passwords.next}
                  >
                    Atualizar password
                  </Button>
                </Stack>
              </Box>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
