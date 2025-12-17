import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import Topbar from './Topbar';

const AppLayout = () => {
  return (
    <Flex minH="100vh" bg="background" color="inherit">
      <SidebarNav />
      <Flex direction="column" flex="1" overflow="hidden">
        <Topbar />
        <Box as="main" px={{ base: 4, md: 8 }} py={6}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default AppLayout;
