import React from 'react';
import { TerminalSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Header = () => {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="bg-slate-900/50 backdrop-blur-md shadow-lg border-b border-slate-700 sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TerminalSquare className="h-8 w-8 text-primary glow-effect" />
          <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-green-400">
            CoDeKu Labs
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Interactive Learning Environment</p>
      </div>
    </motion.header>
  );
};

export default Header;