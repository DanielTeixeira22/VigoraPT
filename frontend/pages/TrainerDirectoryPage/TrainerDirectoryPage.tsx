import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FiSearch, FiAward, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { listPublicTrainers } from '../../services/trainers';
import PageHeader from '../../components/ui/PageHeader';
import type { TrainerProfile } from '../../types/domain';
import { resolveBackendUrl } from '../../utils/url';

// Public trainer directory and search filters.
// Get trainer name from profile and linked user.
const getTrainerName = (t: TrainerProfile) => {
  const user = t.userId as { username?: string; profile?: { firstName?: string; lastName?: string } } | undefined;
  if (user && typeof user === 'object') {
    if (user.profile?.firstName) {
      return `${user.profile.firstName}${user.profile.lastName ? ` ${user.profile.lastName}` : ''}`;
    }
    return user.username || 'Trainer';
  }
  return 'Trainer';
};

// Resolve trainer avatar, preferring the trainer profile.
const getTrainerAvatar = (t: TrainerProfile) => {
  // First, avatar from the trainer profile.
  if (t.avatarUrl) return resolveBackendUrl(t.avatarUrl);
  // Otherwise, avatar from the linked user.
  const user = t.userId as { profile?: { avatarUrl?: string } } | undefined;
  if (user?.profile?.avatarUrl) return resolveBackendUrl(user.profile.avatarUrl);
  return undefined;
};

const TrainerDirectoryPage = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'rating' | 'newest'>('newest');
  const [page, setPage] = useState(1);
  const limit = 9;

  const { data, isFetching } = useQuery({
    queryKey: ['trainers', 'public', search, sort, page],
    queryFn: () => listPublicTrainers({ q: search || undefined, sort, page, limit }),
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const list = items;
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((t: TrainerProfile) => (t.specialties ?? []).some((s: string) => s.toLowerCase().includes(term)) || t.certification?.toLowerCase().includes(term));
  }, [items, search]);

  return (
    <Box>
      <PageHeader
        title="Treinadores"
        subtitle="Encontra o personal trainer ideal para os teus objetivos."
      />
      
      {/* Search and filters */}
      <Box 
        bg="card" 
        border="1px solid" 
        borderColor="border" 
        borderRadius="16px" 
        p={4} 
        mb={6}
      >
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          gap={4} 
          align={{ base: 'stretch', md: 'center' }}
          justify="space-between"
        >
          <InputGroup maxW={{ base: 'full', md: '320px' }}>
            <InputLeftElement>
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input 
              placeholder="Pesquisar por especialidade..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              borderRadius="12px"
              bg="white"
              _dark={{ bg: 'gray.800' }}
            />
          </InputGroup>
          
          <HStack spacing={4}>
            <Select 
              value={sort} 
              onChange={(e) => setSort(e.target.value as 'rating' | 'newest')} 
              w="180px"
              borderRadius="12px"
              bg="white"
              _dark={{ bg: 'gray.800' }}
            >
              <option value="newest">Mais recentes</option>
              <option value="rating">Melhor avaliação</option>
            </Select>
            
            <HStack>
              <Button 
                size="sm" 
                variant="outline"
                leftIcon={<Icon as={FiChevronLeft} />}
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                isDisabled={page === 1 || isFetching}
                borderRadius="10px"
              >
                Anterior
              </Button>
              <Text fontSize="sm" fontWeight={500} px={2}>
                {page} / {data?.pages ?? 1}
              </Text>
              <Button
                size="sm"
                variant="outline"
                rightIcon={<Icon as={FiChevronRight} />}
                onClick={() => setPage((p) => (data?.pages && p < data.pages ? p + 1 : p))}
                isDisabled={isFetching || !data?.pages || page >= (data?.pages ?? 1)}
                borderRadius="10px"
              >
                Seguinte
              </Button>
            </HStack>
          </HStack>
        </Flex>
      </Box>

      {/* Trainers Grid */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={5}>
        {filtered.map((t: TrainerProfile) => (
          <GridItem key={t._id}>
            <Box
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
              cursor="pointer"
            >
              {/* Header with avatar and status */}
              <Flex gap={4} mb={4}>
                <Avatar
                  size="lg"
                  name={getTrainerName(t)}
                  src={getTrainerAvatar(t)}
                  bg="brand.100"
                  color="brand.600"
                />
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Flex justify="space-between" w="100%" align="center">
                    <Text fontWeight={700} fontSize="lg">
                      {getTrainerName(t)}
                    </Text>
                    <Badge 
                      colorScheme={t.validatedByAdmin ? 'green' : 'yellow'} 
                      borderRadius="full"
                      px={2}
                      fontSize="xs"
                    >
                      {t.validatedByAdmin ? '✓ Verificado' : 'Pendente'}
                    </Badge>
                  </Flex>
                </VStack>
              </Flex>

              {/* Certification */}
              <HStack spacing={2} mb={3} color="gray.600" _dark={{ color: 'gray.400' }}>
                <Icon as={FiAward} boxSize={4} />
                <Text fontSize="sm" noOfLines={1}>
                  {t.certification || 'Certificação não especificada'}
                </Text>
              </HStack>

              {/* Specialties */}
              <Stack direction="row" spacing={2} wrap="wrap" mb={4}>
                {(t.specialties ?? []).slice(0, 3).map((s) => (
                  <Badge 
                    key={s} 
                    colorScheme="brand" 
                    variant="subtle"
                    borderRadius="full"
                    px={3}
                    py={1}
                    fontSize="xs"
                    textTransform="capitalize"
                  >
                    {s}
                  </Badge>
                ))}
                {(t.specialties?.length ?? 0) > 3 && (
                  <Badge variant="outline" borderRadius="full" px={2} fontSize="xs">
                    +{(t.specialties?.length ?? 0) - 3}
                  </Badge>
                )}
                {(t.specialties?.length ?? 0) === 0 && (
                  <Text fontSize="sm" color="gray.400" fontStyle="italic">
                    Sem especialidades
                  </Text>
                )}
              </Stack>

              {/* Price */}
              <Flex 
                justify="space-between" 
                align="center" 
                pt={3} 
                borderTop="1px solid" 
                borderColor="border"
              >
                <HStack spacing={2} color="gray.500">
                  <Text fontSize="lg">€</Text>
                  <Text fontSize="sm">Preço/hora</Text>
                </HStack>
                <Text fontWeight={700} fontSize="lg" color="brand.500">
                  {t.hourlyRate ? `${t.hourlyRate}€` : 'A consultar'}
                </Text>
              </Flex>
            </Box>
          </GridItem>
        ))}
      </Grid>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Flex 
          direction="column" 
          align="center" 
          justify="center" 
          py={16}
          color="gray.400"
        >
          <Icon as={FiSearch} boxSize={12} mb={4} />
          <Text fontSize="lg" fontWeight={500}>Nenhum treinador encontrado</Text>
          <Text fontSize="sm">Tenta ajustar os filtros de pesquisa</Text>
        </Flex>
      )}
    </Box>
  );
};

export default TrainerDirectoryPage;
