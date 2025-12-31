// UI component: Stat Card.

import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
}

const StatCard = ({ label, value, helper, icon }: Props) => (
  <Box bg="card" border="1px solid" borderColor="border" borderRadius="16px" p={4} boxShadow="md">
    <Flex align="center" gap={3} mb={2}>
      {icon && (
        <Box
          bg="rgba(51,183,158,0.12)"
          color="brand.600"
          _dark={{ bg: 'rgba(77,209,184,0.12)', color: 'brand.200' }}
          borderRadius="12px"
          p={2}
        >
          {icon}
        </Box>
      )}
      <Text textTransform="uppercase" fontSize="xs" letterSpacing="0.12em" color="muted">
        {label}
      </Text>
    </Flex>
    <Heading size="lg" mb={1}>
      {value}
    </Heading>
    {helper && (
      <Text fontSize="sm" color="muted">
        {helper}
      </Text>
    )}
  </Box>
);

export default StatCard;
