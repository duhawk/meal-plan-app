export const nav = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features#reviews' },
];

export const features = [
  { icon: 'Utensils', title: 'Weekly Menu', desc: 'Publish meals by day with images, notes, and dietary tags.' },
  { icon: 'Clock', title: 'Late Plates', desc: 'Members request plates with pickup notes—no more messy group chats.' },
  { icon: 'Star', title: 'Meal Reviews', desc: 'Collect ratings/comments to improve meals and vendors.' },
  { icon: 'Users', title: 'Attendance', desc: 'One-tap attendance and headcount summaries for the kitchen.' },
  { icon: 'ShieldCheck', title: 'Access Codes', desc: 'Invite chapters in minutes and keep data scoped by house.' },
  { icon: 'BarChart2', title: 'Insights', desc: 'Simple trends over time to guide budgets and planning.' },
];

export const pricing = {
  features: [
    'Unlimited members',
    'Weekly menu planner',
    'Late plate requests',
    'Reviews & attendance',
    'Chapter access codes',
    'Email support',
  ],
  plans: [
    { name: 'Starter', monthly: 0, yearly: 0, highlight: false, cta: 'Get started' },
    { name: 'House', monthly: 29, yearly: 290, highlight: true, cta: 'Start House plan' },
    { name: 'National', monthly: 99, yearly: 990, highlight: false, cta: 'Contact sales' },
  ],
};

export const testimonials = [
  { name: 'Chapter President', role: 'Alpha Beta', quote: 'This replaced 3 group chats and made our cook’s life easier.', avatar: '' },
  { name: 'Kitchen Lead', role: 'Gamma Delta', quote: 'Attendance and late plates are dialed in. Love the speed.', avatar: '' },
  { name: 'House Manager', role: 'Omega', quote: 'Feedback helped us tweak menus and cut waste by 18%.', avatar: '' },
];

export const faqs = [
  { q: 'Can we use access codes for multiple chapters?', a: 'Yes. Each code maps to a chapter; you can support many houses under one umbrella.' },
  { q: 'Is it mobile friendly?', a: 'The app is designed mobile-first with a clean, snappy UI.' },
  { q: 'Do members need accounts?', a: 'Yes, each member signs in once and is linked to a chapter via access code.' },
  { q: 'What about admin controls?', a: 'Admins can add meals, view feedback, mark attendance and export data.' },
];

export const footer = {
  sitemap: [
    { label: 'Product', links: [ ['Home', '/'], ['Features', '/features'] ] },
  ],
  socials: [
    { label: 'LinkedIn', href: '#' },
    { label: 'GitHub', href: '#' },
  ],
};
