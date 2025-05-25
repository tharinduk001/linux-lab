
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900/50 border-t border-slate-700 py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Horizon Labs. All rights reserved. 
          Powered by <span className="text-primary font-semibold">Hostinger Horizons</span>.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
  