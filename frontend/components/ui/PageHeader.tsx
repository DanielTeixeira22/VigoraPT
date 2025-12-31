// UI component: Page Header.

import { Flex, Heading, HStack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  extra?: ReactNode;
}

const PageHeader = ({ title, subtitle, action, extra }: Props) => (
  <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" gap={3} mb={6} wrap="wrap">
    <div>
      <Heading size="lg">{title}</Heading>
      {subtitle && (
        <Text color="muted" mt={1}>
          {subtitle}
        </Text>
      )}
    </div>
    <HStack>
      {extra}
      {action}
    </HStack>
  </Flex>
);

export default PageHeader;
