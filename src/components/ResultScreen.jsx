export default function ResultScreen({ result, onRestart }) {
  const rate = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0

  return (
    <div className="result-screen">
      <h1>けっか</h1>
      <div className="result-card">
        <p className="result-rate">{rate}%</p>
        <p className="result-detail">
          {result.total}問中 {result.correct}問 正解
        </p>
        <p className="result-detail-sub">不正解: {result.incorrect}問</p>
      </div>
      <button className="primary-button" onClick={onRestart}>
        もう一度えらぶ
      </button>
    </div>
  )
}
