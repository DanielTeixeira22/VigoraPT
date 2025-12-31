import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FiMail, FiTarget, FiSend, FiUserPlus, FiSearch, FiUser } from 'react-icons/fi';
import { listMyClients, trainerCreateClient } from '../../services/clients';
import { sendAlert } from '../../services/notifications';
import PageHeader from '../../components/ui/PageHeader';
import type { ClientProfile, User } from '../../types/domain';
import { resolveBackendUrl } from '../../utils/url';

type ClientWithUser = ClientProfile & { userId?: User };

// Trainer client management page.

const MyClientsPage = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    goals: '',
  });
  const [alerts, setAlerts] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ['clients', 'my'],
    queryFn: listMyClients,
  });

  const mutation = useMutation({
    mutationFn: trainerCreateClient,
    onSuccess: () => {
      toast({ title: 'Cliente criado com sucesso!', status: 'success' });
      qc.invalidateQueries({ queryKey: ['clients', 'my'] });
      setForm({ username: '', email: '', password: '', firstName: '', lastName: '', goals: '' });
    },
    onError: () => toast({ title: 'Erro ao criar cliente', status: 'error' }),
  });

  const alertMutation = useMutation({
    mutationFn: sendAlert,
    onSuccess: (_, variables) => {
      toast({ title: 'Alerta enviado!', status: 'success' });
      setAlerts({ ...alerts, [variables.clientId!]: '' });
    },
    onError: () => toast({ title: 'Falha ao enviar alerta', status: 'error' }),
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return ((data ?? []) as ClientWithUser[]).filter((c) => {
      const u = c.userId;
      return (
        (u?.username ?? '').toLowerCase().includes(term) ||
        (u?.email ?? '').toLowerCase().includes(term) ||
        (u?.profile?.firstName ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, search]);

  return (
    <Box>
      <PageHeader
        title="Clientes"
        subtitle="Gere os teus clientes e envia alertas personalizados."
      />
      
      {/* Search bar */}
      <Box 
        bg="card" 
        border="1px solid" 
        borderColor="border" 
        borderRadius="16px" 
        p={4} 
        mb={6}
      >
        <InputGroup maxW="400px">
          <InputLeftElement>
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input 
            placeholder="Pesquisar clientes..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            borderRadius="12px"
            bg="white"
            _dark={{ bg: 'gray.800' }}
          />
        </InputGroup>
      </Box>

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        <GridItem>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            {filtered.map((c) => {
              const name = c.userId?.profile?.firstName 
                ? `${c.userId.profile.firstName}${c.userId.profile?.lastName ? ` ${c.userId.profile.lastName}` : ''}`
                : c.userId?.username || 'Cliente';
              
              return (
                <Box
                  key={c._id}
                  bg="card"
                  border="1px solid"
                  borderColor="border"
                  borderRadius="16px"
                  p={5}
                  transition="all 0.3s"
                  _hover={{
                    transform: 'translateY(-4px)',
                    boxShadow: 'xl',
                    borderColor: 'brand.200',
                  }}
                >
                  {/* Header with avatar */}
                  <Flex gap={4} mb={4}>
                    <Avatar
                      size="lg"
                      name={name}
                      src={resolveBackendUrl(c.userId?.profile?.avatarUrl)}
                      bg="brand.100"
                      color="brand.600"
                    />
                    <VStack align="flex-start" spacing={0} flex={1} justify="center">
                      <Text fontWeight={700} fontSize="lg" noOfLines={1}>
                        {name}
                      </Text>
                      <HStack spacing={1} color="gray.500">
                        <Icon as={FiMail} boxSize={3} />
                        <Text fontSize="sm" noOfLines={1}>
                          {c.userId?.email || 'Sem email'}
                        </Text>
                      </HStack>
                    </VStack>
                  </Flex>

                  {/* Goals */}
                  <Box 
                    p={3} 
                    bg="gray.50" 
                    _dark={{ bg: 'whiteAlpha.50' }}
                    borderRadius="12px" 
                    mb={4}
                  >
                    <HStack spacing={2} mb={1}>
                      <Icon as={FiTarget} boxSize={4} color="brand.500" />
                      <Text fontSize="sm" fontWeight={600} color="gray.600" _dark={{ color: 'gray.300' }}>
                        Objetivos
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }}>
                      {c.goals || 'Nenhum objetivo definido'}
                    </Text>
                  </Box>

                  {/* Quick message */}
                  <Stack spacing={3}>
                    <Input
                      size="sm"
                      placeholder="Escreve uma mensagem rápida..."
                      value={alerts[c._id!] ?? ''}
                      onChange={(e) => setAlerts({ ...alerts, [c._id!]: e.target.value })}
                      borderRadius="10px"
                      bg="white"
                      _dark={{ bg: 'gray.800' }}
                    />
                    <Button
                      size="sm"
                      colorScheme="brand"
                      leftIcon={<Icon as={FiSend} />}
                      onClick={() => c._id && alertMutation.mutate({ clientId: c._id, message: alerts[c._id!] })}
                      isLoading={alertMutation.isPending}
                      isDisabled={!alerts[c._id!]?.trim()}
                      borderRadius="10px"
                    >
                      Enviar alerta
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </SimpleGrid>
          
          {/* Empty state */}
          {filtered.length === 0 && (
            <Flex 
              direction="column" 
              align="center" 
              justify="center" 
              py={16}
              color="gray.400"
            >
              <Icon as={FiUser} boxSize={12} mb={4} />
              <Text fontSize="lg" fontWeight={500}>Sem clientes</Text>
              <Text fontSize="sm">Adiciona o teu primeiro cliente no formulário ao lado</Text>
            </Flex>
          )}
        </GridItem>

        {/* Add client form */}
        <GridItem>
          <Box
            bg="card"
            border="1px solid"
            borderColor="border"
            borderRadius="16px"
            p={5}
            position="sticky"
            top="100px"
          >
            <Flex align="center" gap={2} mb={4}>
              <Icon as={FiUserPlus} color="brand.500" boxSize={5} />
              <Text fontWeight={700} fontSize="lg">
                Adicionar cliente
              </Text>
            </Flex>
            
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Username</FormLabel>
                <Input 
                  value={form.username} 
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  borderRadius="10px"
                  placeholder="ex: joaosilva"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input 
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  borderRadius="10px"
                  placeholder="ex: joao@email.com"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Password</FormLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  borderRadius="10px"
                  placeholder="Mínimo 8 caracteres"
                />
              </FormControl>
              <Grid templateColumns="1fr 1fr" gap={3}>
                <FormControl>
                  <FormLabel fontSize="sm">Primeiro nome</FormLabel>
                  <Input 
                    value={form.firstName} 
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    borderRadius="10px"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Apelido</FormLabel>
                  <Input 
                    value={form.lastName} 
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    borderRadius="10px"
                  />
                </FormControl>
              </Grid>
              <FormControl>
                <FormLabel fontSize="sm">Objetivos</FormLabel>
                <Textarea 
                  value={form.goals} 
                  onChange={(e) => setForm({ ...form, goals: e.target.value })}
                  borderRadius="10px"
                  placeholder="Ex: Perder peso, ganhar massa muscular..."
                  rows={3}
                />
              </FormControl>
              <Button 
                colorScheme="brand"
                size="lg"
                onClick={() => mutation.mutate(form)} 
                isLoading={mutation.isPending}
                borderRadius="12px"
                leftIcon={<Icon as={FiUserPlus} />}
              >
                Criar cliente
              </Button>
            </Stack>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default MyClientsPage;
