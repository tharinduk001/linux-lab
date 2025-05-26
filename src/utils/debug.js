/**
 * Utility functions to help debug rendering issues
 */

export const logComponentRender = (componentName) => {
  console.log(`Component ${componentName} rendered at ${new Date().toISOString()}`);
};

export const checkDOMElement = (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID "${elementId}" not found in the DOM`);
    return false;
  }
  
  console.log(`Element with ID "${elementId}" found, dimensions: ${element.offsetWidth}x${element.offsetHeight}`);
  
  // Check if element is visible
  const style = window.getComputedStyle(element);
  if (style.display === 'none') {
    console.warn(`Element with ID "${elementId}" has display: none`);
  }
  if (style.visibility === 'hidden') {
    console.warn(`Element with ID "${elementId}" has visibility: hidden`);
  }
  if (parseFloat(style.opacity) === 0) {
    console.warn(`Element with ID "${elementId}" has opacity: 0`);
  }
  
  return true;
};

export const inspectReactTree = () => {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools detected. Check Components tab for rendering issues.');
  } else {
    console.warn('React DevTools not detected. Install the React DevTools browser extension for better debugging.');
  }
};
