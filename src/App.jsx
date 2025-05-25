
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import LabEnvironmentPage from '@/pages/LabEnvironmentPage';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<LabEnvironmentPage />} />
          </Routes>
          <Toaster />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
  