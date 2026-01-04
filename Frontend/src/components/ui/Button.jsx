import React from 'react';

const Button = React.forwardRef(({ className, children, ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-primary text-white shadow-sm hover:bg-opacity-90 focus-visible:ring-primary',
    secondary: 'bg-surface text-text-primary border border-border-light shadow-sm hover:bg-opacity-80 focus-visible:ring-primary',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500',
  };

  const { variant = 'primary', ...rest } = props;

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
