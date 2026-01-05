import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
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
  const [sort, setSort] = useState<'name_asc' | 'name_desc' | 'clients_asc' | 'clients_desc'>('name_asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  const { data, isFetching } = useQuery({
    queryKey: ['trainers', 'public', search, sort, page, limit],
    queryFn: () => listPublicTrainers({ q: search || undefined, sort, page, limit }),
  });

  const items = useMemo(() => data?.items ?? [], [data]);

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
              placeholder="Pesquisar por nome..." 
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
              onChange={(e) => setSort(e.target.value as 'name_asc' | 'name_desc' | 'clients_asc' | 'clients_desc')} 
              w="200px"
              borderRadius="12px"
              bg="white"
              _dark={{ bg: 'gray.800' }}
            >
              <option value="name_asc">Nome (A-Z)</option>
              <option value="name_desc">Nome (Z-A)</option>
              <option value="clients_desc">Nº Clientes (↓)</option>
              <option value="clients_asc">Nº Clientes (↑)</option>
            </Select>
            
            <Select 
              value={limit} 
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} 
              w="100px"
              borderRadius="12px"
              bg="white"
              _dark={{ bg: 'gray.800' }}
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
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

      {/* Trainers Table */}
      <Box
        bg="card"
        border="1px solid"
        borderColor="border"
        borderRadius="16px"
        overflow="hidden"
      >
        <Table variant="simple">
          <Thead bg="gray.50" _dark={{ bg: 'gray.800' }}>
            <Tr>
              <Th>Treinador</Th>
              <Th>Certificação</Th>
              <Th>Especialidades</Th>
              <Th>Estado</Th>
              <Th isNumeric>Nº Clientes</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((t: TrainerProfile) => (
              <Tr
                key={t._id}
                _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
                cursor="pointer"
                transition="background 0.2s"
              >
                {/* Trainer Name & Avatar */}
                <Td>
                  <HStack spacing={3}>
                    <Avatar
                      size="sm"
                      name={getTrainerName(t)}
                      src={getTrainerAvatar(t)}
                      bg="brand.100"
                      color="brand.600"
                    />
                    <Text fontWeight={600}>{getTrainerName(t)}</Text>
                  </HStack>
                </Td>

                {/* Certification */}
                <Td>
                  <HStack spacing={2} color="gray.600" _dark={{ color: 'gray.400' }}>
                    <Icon as={FiAward} boxSize={4} />
                    <Text fontSize="sm" noOfLines={1}>
                      {t.certification || 'Não especificada'}
                    </Text>
                  </HStack>
                </Td>

                {/* Specialties */}
                <Td>
                  <HStack spacing={2} wrap="wrap">
                    {(t.specialties ?? []).slice(0, 2).map((s) => (
                      <Badge
                        key={s}
                        colorScheme="brand"
                        variant="subtle"
                        borderRadius="full"
                        px={2}
                        py={0.5}
                        fontSize="xs"
                        textTransform="capitalize"
                      >
                        {s}
                      </Badge>
                    ))}
                    {(t.specialties?.length ?? 0) > 2 && (
                      <Badge variant="outline" borderRadius="full" px={2} fontSize="xs">
                        +{(t.specialties?.length ?? 0) - 2}
                      </Badge>
                    )}
                    {(t.specialties?.length ?? 0) === 0 && (
                      <Text fontSize="sm" color="gray.400" fontStyle="italic">
                        —
                      </Text>
                    )}
                  </HStack>
                </Td>

                {/* Status */}
                <Td>
                  <Badge
                    colorScheme={t.validatedByAdmin ? 'green' : 'yellow'}
                    borderRadius="full"
                    px={2}
                    fontSize="xs"
                  >
                    {t.validatedByAdmin ? '✓ Verificado' : 'Pendente'}
                  </Badge>
                </Td>

                {/* Client Count */}
                <Td isNumeric>
                  <Text fontWeight={700} color="brand.500">
                    {(t as TrainerProfile & { clientCount?: number }).clientCount ?? 0}
                  </Text>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Empty state */}
      {items.length === 0 && (
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
