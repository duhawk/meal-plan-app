import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', predicted: 30, actual: 28 },
  { name: 'Tue', predicted: 35, actual: 32 },
  { name: 'Wed', predicted: 40, actual: 42 },
  { name: 'Thu', predicted: 38, actual: 35 },
  { name: 'Fri', predicted: 45, actual: 40 },
  { name: 'Sat', predicted: 0, actual: 0 },
  { name: 'Sun', predicted: 25, actual: 22 },
];

export default function AttendanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
        <XAxis dataKey="name" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" />
        <Tooltip
          contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }}
          labelStyle={{ color: '#E2E8F0' }}
        />
        <Legend wrapperStyle={{ color: '#E2E8F0' }} />
        <Bar dataKey="predicted" fill="#63B3ED" />
        <Bar dataKey="actual" fill="#4FD1C5" />
      </BarChart>
    </ResponsiveContainer>
  );
}
