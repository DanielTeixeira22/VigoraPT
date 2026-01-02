import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Progress,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { FiKey, FiLock, FiRefreshCw, FiSettings, FiUser } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import { changePassword, updateMe } from '../../services/users';
import { qrGenerate } from '../../services/auth';
import { uploadFile } from '../../services/uploads';
import { listPublicTrainers } from '../../services/trainers';
import { getMyClientProfile } from '../../services/clients';
import { createTrainerChangeRequest, listTrainerChangeRequests } from '../../services/trainerChange';
import { getCurrentMetrics, recordBodyMetric } from '../../services/bodyMetrics';
import type { AxiosError } from 'axios';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';

const ProfilePage = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const { user, refreshSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [local, setLocal] = useState({
    email: user?.email ?? '',
    firstName: user?.profile.firstName ?? '',
    lastName: user?.profile.lastName ?? '',
    avatarUrl: user?.profile.avatarUrl ?? '',
  });
  const [bodyMetrics, setBodyMetrics] = useState({ weight: '', muscleMass: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [qrToken, setQrToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [changeRequest, setChangeRequest] = useState({ trainerId: '', reason: '' });

  const { data: clientProfile } = useQuery({
    queryKey: ['client', 'me'],
    enabled: user?.role === 'CLIENT',
    queryFn: getMyClientProfile,
  });

  // Fetch current body metrics for clients
  const { data: currentMetricsData } = useQuery({
    queryKey: ['body-metrics', 'current'],
    enabled: user?.role === 'CLIENT',
    queryFn: getCurrentMetrics,
  });

  useEffect(() => {
    if (currentMetricsData) {
      setBodyMetrics({
        weight: currentMetricsData.currentWeight?.toString() ?? '',
        muscleMass: currentMetricsData.currentMuscleMass?.toString() ?? '',
      });
    }
  }, [currentMetricsData]);

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

    // Validate file type.
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Por favor seleciona uma imagem', status: 'warning' });
      return;
    }

    // Validate size (max 5MB).
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
      <PageHeader title="Perfil" subtitle="Gere os teus dados pessoais, segurança e definições da conta." />

      <Card>
        <CardBody>
          <Tabs colorScheme="brand" variant="enclosed" isLazy>
            <TabList mb={4}>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiUser} />
                  <Text>Dados Pessoais</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Icon as={FiLock} />
                  <Text>Segurança</Text>
                </HStack>
              </Tab>
              {/* Tab Conta apenas para CLIENT */}
              {user?.role === 'CLIENT' && (
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiSettings} />
                    <Text>Conta</Text>
                  </HStack>
                </Tab>
              )}
            </TabList>

            <TabPanels>
              {/* TAB 1: Personal Data */}
              <TabPanel px={0}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate(local);
                  }}
                >
                  <Stack spacing={5} maxW="600px">
                    {/* Avatar Upload */}
                    <FormControl>
                      <FormLabel fontWeight={600}>Avatar</FormLabel>
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
                      <FormLabel fontWeight={600}>Email</FormLabel>
                      <Input value={local.email} onChange={(e) => setLocal({ ...local, email: e.target.value })} />
                    </FormControl>
                    {/* Campos de nome apenas para CLIENT e TRAINER */}
                    {(user?.role === 'CLIENT' || user?.role === 'TRAINER') && (
                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel fontWeight={600}>Primeiro nome</FormLabel>
                          <Input value={local.firstName} onChange={(e) => setLocal({ ...local, firstName: e.target.value })} />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontWeight={600}>Apelido</FormLabel>
                          <Input value={local.lastName} onChange={(e) => setLocal({ ...local, lastName: e.target.value })} />
                        </FormControl>
                      </HStack>
                    )}

                    {/* Weight and Muscle Mass for Clients */}
                    {user?.role === 'CLIENT' && (
                      <Box p={4} bg="brand.50" _dark={{ bg: 'gray.700' }} borderRadius="12px">
                        <Text fontWeight={600} mb={3}>📊 Métricas Corporais</Text>
                        <HStack spacing={4}>
                          <FormControl>
                            <FormLabel fontWeight={600}>Peso (kg)</FormLabel>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 70.5"
                              value={bodyMetrics.weight}
                              onChange={(e) => setBodyMetrics({ ...bodyMetrics, weight: e.target.value })}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontWeight={600}>Massa Muscular (%)</FormLabel>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Ex: 16.5"
                              value={bodyMetrics.muscleMass}
                              onChange={(e) => setBodyMetrics({ ...bodyMetrics, muscleMass: e.target.value })}
                            />
                          </FormControl>
                        </HStack>
                        <Button
                          mt={3}
                          size="sm"
                          colorScheme="brand"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await recordBodyMetric({
                                weight: bodyMetrics.weight ? parseFloat(bodyMetrics.weight) : undefined,
                                muscleMass: bodyMetrics.muscleMass ? parseFloat(bodyMetrics.muscleMass) : undefined,
                              });
                              toast({ title: 'Métricas atualizadas!', status: 'success' });
                              // Invalidate queries so they refresh automatically
                              qc.invalidateQueries({ queryKey: ['body-metrics'] });
                            } catch {
                              toast({ title: 'Erro ao atualizar métricas', status: 'error' });
                            }
                          }}
                        >
                          Atualizar métricas
                        </Button>
                      </Box>
                    )}
                    <Button type="submit" colorScheme="brand" size="lg" isLoading={mutation.isPending}>
                      Guardar alterações
                    </Button>
                  </Stack>
                </form>
              </TabPanel>

              {/* TAB 2: Security */}
              <TabPanel px={0}>
                <Stack spacing={6} maxW="500px">
                  {/* Password Change */}
                  <Box p={5} border="1px solid" borderColor="border" borderRadius="12px">
                    <Heading size="sm" mb={4}><Icon as={FiKey} mr={2} verticalAlign="text-bottom" />Alteração de password</Heading>
                    <Stack spacing={4}>
                      <FormControl isRequired>
                        <FormLabel fontWeight={600}>Password atual</FormLabel>
                        <Input
                          type="password"
                          value={passwords.current}
                          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontWeight={600}>Nova password</FormLabel>
                        <Input
                          type="password"
                          value={passwords.next}
                          onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                        />
                      </FormControl>
                      <Button
                        colorScheme="brand"
                        onClick={() => passwordMutation.mutate()}
                        isLoading={passwordMutation.isPending}
                        isDisabled={!passwords.current || !passwords.next}
                      >
                        Atualizar password
                      </Button>
                    </Stack>
                  </Box>

                  {/* QR code for login */}
                  <Box 
                    p={5} 
                    borderRadius="16px" 
                    bgGradient="linear(to-br, brand.50, teal.50)"
                    _dark={{ bgGradient: 'linear(to-br, gray.800, gray.700)', borderColor: 'brand.700' }}
                    border="1px solid"
                    borderColor="brand.200"
                  >
                    <Flex align="center" gap={3} mb={4}>
                      <Box 
                        bg="brand.500" 
                        color="white" 
                        p={2} 
                        borderRadius="10px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                          <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
                          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                          <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
                          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                          <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
                          <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
                          <rect x="17" y="17" width="4" height="4" fill="currentColor"/>
                          <rect x="14" y="19" width="2" height="2" fill="currentColor"/>
                        </svg>
                      </Box>
                      <Box flex={1}>
                        <Text fontWeight={700} fontSize="md" color="gray.800" _dark={{ color: 'white' }}>
                          Login via QR Code
                        </Text>
                        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                          Criar um código para fazeres login noutro dispositivo
                        </Text>
                      </Box>
                    </Flex>

                    {!qrToken ? (
                      <Button
                        w="100%"
                        colorScheme="brand"
                        size="lg"
                        isLoading={qrLoading}
                        loadingText="A gerar..."
                        onClick={async () => {
                          setQrLoading(true);
                          try {
                            const res = await qrGenerate();
                            setQrToken(res);
                            toast({ title: 'QR Code gerado!', description: 'Escaneia com a câmara na página de login.', status: 'success' });
                          } catch {
                            toast({ title: 'Erro ao gerar QR', description: 'Tenta novamente.', status: 'error' });
                          } finally {
                            setQrLoading(false);
                          }
                        }}
                      >
                        Criar QR Code
                      </Button>
                    ) : (
                      <Flex direction="column" align="center">
                        <Box 
                          p={4} 
                          bg="white" 
                          borderRadius="16px" 
                          boxShadow="lg"
                          border="3px solid"
                          borderColor="brand.400"
                        >
                          <QRCodeSVG 
                            value={qrToken.token} 
                            size={200} 
                            level="H"
                            includeMargin
                          />
                        </Box>
                        <Stack spacing={1} mt={4} align="center">
                          <Text fontSize="sm" fontWeight={600} color="brand.600" _dark={{ color: 'brand.300' }}>
                            ⏱️ Expira às {new Date(qrToken.expiresAt).toLocaleTimeString()}
                          </Text>
                          <Text fontSize="xs" color="gray.500" textAlign="center">
                            Aponta a câmara para este código na página de login
                          </Text>
                        </Stack>
                        <Button
                          mt={4}
                          size="sm"
                          variant="outline"
                          colorScheme="brand"
                          isLoading={qrLoading}
                          onClick={async () => {
                            setQrLoading(true);
                            try {
                              const res = await qrGenerate();
                              setQrToken(res);
                              toast({ title: 'Novo QR Code gerado!', status: 'success' });
                            } catch {
                              toast({ title: 'Erro ao gerar QR', status: 'error' });
                            } finally {
                              setQrLoading(false);
                            }
                          }}
                        >
                          🔄 Regenerar QR Code
                        </Button>
                      </Flex>
                    )}
                  </Box>
                </Stack>
              </TabPanel>

              {/* TAB 3: Conta - apenas para CLIENT */}
              {user?.role === 'CLIENT' && (
                <TabPanel px={0}>
                  <Stack spacing={6} maxW="600px">
                    {/* Request trainer change (clients only) */}
                    <Box p={5} border="1px solid" borderColor="border" borderRadius="12px">
                      <Heading size="sm" mb={2}><Icon as={FiRefreshCw} mr={2} verticalAlign="text-bottom" />Pedir alteração de treinador</Heading>
                      <Text fontSize="sm" color="muted" mb={4}>
                        Escolhe um treinador validado e envia o pedido ao administrador.
                      </Text>

                      {(trainerOptions?.items?.length ?? 0) === 0 && (
                        <Text fontSize="sm" color="orange.400" mb={3}>
                          Ainda não há personal trainers validados disponíveis.
                        </Text>
                      )}

                      {pendingRequest && (
                        <Box mb={4} p={3} bg="yellow.50" _dark={{ bg: 'yellow.900' }} borderRadius="8px">
                          <Text fontSize="sm" color="yellow.600" _dark={{ color: 'yellow.300' }}>
                            ⏳ Já tens um pedido de mudança pendente. Aguarda a decisão do administrador.
                          </Text>
                        </Box>
                      )}

                      <Stack spacing={4}>
                        <FormControl isRequired>
                          <FormLabel fontWeight={600}>Novo treinador</FormLabel>
                          <Select
                            placeholder="Seleciona"
                            value={changeRequest.trainerId}
                            onChange={(e) => setChangeRequest({ ...changeRequest, trainerId: e.target.value })}
                            isDisabled={(trainerOptions?.items?.length ?? 0) === 0 || !!pendingRequest}
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
                          <FormLabel fontWeight={600}>Motivo (opcional)</FormLabel>
                          <Textarea
                            value={changeRequest.reason}
                            onChange={(e) => setChangeRequest({ ...changeRequest, reason: e.target.value })}
                            isDisabled={!!pendingRequest}
                          />
                        </FormControl>
                        <Button
                          colorScheme="brand"
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
                  </Stack>
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </Box>
  );
};

export default ProfilePage;
