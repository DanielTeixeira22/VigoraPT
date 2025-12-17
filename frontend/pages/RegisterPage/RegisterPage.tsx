import {
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [wantsTrainer, setWantsTrainer] = useState(false);
  const [trainerInfo, setTrainerInfo] = useState({
    certification: '',
    specialties: '',
    hourlyRate: '',
    document: null as File | null,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        ...form,
        wantsTrainer,
        trainerCertification: trainerInfo.certification || undefined,
        trainerSpecialties: trainerInfo.specialties || undefined,
        trainerHourlyRate: trainerInfo.hourlyRate || undefined,
        trainerDocument: trainerInfo.document,
      });
      toast({
        title: 'Conta criada',
        description: wantsTrainer
          ? 'Inicia sessão e pede validação de treinador ao administrador.'
          : 'Já podes aceder ao dashboard.',
        status: 'success',
      });
      navigate('/dashboard');
    } catch (err) {
      const message =
        err instanceof AxiosError && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Tenta novamente.';
      toast({ title: 'Erro ao registar', description: message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="background">
      <Card w={{ base: '92%', md: '620px' }} boxShadow="2xl">
        <CardBody>
          <Heading size="lg" mb={2}>
            Criar conta
          </Heading>
          <Text color="muted" mb={6}>
            O registo público cria um perfil de Cliente. Para ser Personal Trainer, pede validação ao admin após login.
          </Text>

      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Username</FormLabel>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Primeiro nome</FormLabel>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Apelido</FormLabel>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </FormControl>

          <Checkbox isChecked={wantsTrainer} onChange={(e) => setWantsTrainer(e.target.checked)}>
            Quero ser personal trainer (admin terá de validar)
          </Checkbox>

          {wantsTrainer && (
            <Stack spacing={3} p={3} border="1px solid" borderColor="border" borderRadius="12px">
              <Text fontWeight={700}>Dados profissionais</Text>
              <FormControl>
                <FormLabel>Certificação</FormLabel>
                <Input
                  value={trainerInfo.certification}
                  onChange={(e) => setTrainerInfo({ ...trainerInfo, certification: e.target.value })}
                  placeholder="Ex.: Cédula TÉF"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Especialidades (separadas por vírgula)</FormLabel>
                <Input
                  value={trainerInfo.specialties}
                  onChange={(e) => setTrainerInfo({ ...trainerInfo, specialties: e.target.value })}
                  placeholder="Ex.: hipertrofia, reabilitação"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Preço hora (€)</FormLabel>
                <Input
                  type="number"
                  value={trainerInfo.hourlyRate}
                  onChange={(e) => setTrainerInfo({ ...trainerInfo, hourlyRate: e.target.value })}
                  placeholder="Ex.: 35"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Documentos (certificados)</FormLabel>
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setTrainerInfo({ ...trainerInfo, document: e.target.files?.[0] ?? null })}
                />
              </FormControl>
            </Stack>
          )}

              <Button type="submit" isLoading={loading}>
                Registar
              </Button>
            </Stack>
          </form>

          <Box mt={4}>
            <Text fontSize="sm">
              Já tens conta?{' '}
              <Link as={RouterLink} to="/login" color="brand.500">
                Entrar
              </Link>
            </Text>
          </Box>
        </CardBody>
      </Card>
    </Flex>
  );
};

export default RegisterPage;
