"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Definisikan tipe data untuk props
type ChartData = {
    name: string;
    score: number;
};

interface AspectChartProps {
    title: string;
    data: ChartData[];
}

export const AspectChart = ({ title, data }: AspectChartProps) => {
    // Jika tidak ada data, jangan render apa-apa
    if (!data || data.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                    <BarChart 
                        data={data} 
                        layout="vertical" 
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={70} 
                            tickLine={false} 
                            axisLine={false} 
                            fontSize={12} 
                            stroke="#334155"
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                            formatter={(value: number) => [value.toFixed(1), 'Skor']}
                            labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Bar 
                            dataKey="score" 
                            fill="#033F3F" 
                            radius={[0, 8, 8, 0]} 
                            barSize={20}
                            label={<CustomBarLabel />}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

// Custom label component for Bar
const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
        <text
            x={x + width + 5}
            y={y + height / 2}
            fill="#022020"
            fontSize={12}
            alignmentBaseline="middle"
        >
            {Number(value).toFixed(1)}
        </text>
    );
};