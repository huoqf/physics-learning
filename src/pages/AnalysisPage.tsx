import { useParams } from 'react-router-dom';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-neutral-900">题目解析 - {id}</h1>
    </div>
  );
}
