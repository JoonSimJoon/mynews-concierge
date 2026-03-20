"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Quiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  relatedArticle?: {
    articleId: number;
    title: string;
    category: string;
  };
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz");
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === quizzes[current].answer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (current + 1 >= quizzes.length) {
      setFinished(true);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    fetchQuizzes();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">AI가 오늘의 뉴스 퀴즈를 만들고 있어요...</p>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">퀴즈를 불러올 수 없습니다</p>
          <Link href="/" className="text-blue-400 text-sm">피드로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (finished) {
    const emoji = score === quizzes.length ? "🎉" : score >= quizzes.length / 2 ? "👏" : "💪";
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <p className="text-6xl mb-4">{emoji}</p>
          <h2 className="text-2xl font-bold mb-2">퀴즈 완료!</h2>
          <p className="text-zinc-400 mb-6">
            {quizzes.length}문제 중 <span className="text-blue-400 font-bold">{score}개</span> 정답
          </p>
          <div className="w-32 h-32 mx-auto mb-6 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#27272a" strokeWidth="2" />
              <circle
                cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="2"
                strokeDasharray={`${(score / quizzes.length) * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{Math.round((score / quizzes.length) * 100)}%</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRestart} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold">
              다시 도전
            </button>
            <Link href="/" className="flex-1 py-3 border border-zinc-700 rounded-xl text-zinc-400 hover:bg-zinc-800 text-center">
              피드로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const quiz = quizzes[current];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="text-zinc-400 hover:text-white">← 피드</Link>
          <h1 className="text-lg font-bold">뉴스 퀴즈</h1>
          <span className="text-xs text-zinc-500">{current + 1}/{quizzes.length}</span>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {quizzes.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < current ? "bg-blue-500" : i === current ? "bg-blue-400" : "bg-zinc-800"}`} />
          ))}
        </div>

        {/* Question */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-4">
          <p className="text-xs text-blue-400 font-semibold mb-3">Q{current + 1}</p>
          <h2 className="text-lg font-bold leading-snug">{quiz.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-4">
          {quiz.options.map((option, idx) => {
            let style = "border-zinc-800 hover:border-zinc-600";
            if (selected !== null) {
              if (idx === quiz.answer) style = "border-emerald-500 bg-emerald-500/10";
              else if (idx === selected) style = "border-red-500 bg-red-500/10";
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={`w-full text-left p-4 rounded-xl border transition-all ${style}`}
              >
                <span className="text-xs text-zinc-500 mr-2">{String.fromCharCode(65 + idx)}</span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {selected !== null && (
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 mb-4">
            <p className="text-xs font-bold text-zinc-400 mb-2">
              {selected === quiz.answer ? "🎯 정답!" : "❌ 오답"}
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{quiz.explanation}</p>
            {quiz.relatedArticle && (
              <Link
                href={`/article/${quiz.relatedArticle.articleId}`}
                className="block mt-3 text-xs text-blue-400 hover:text-blue-300"
              >
                📰 관련 기사: {quiz.relatedArticle.title}
              </Link>
            )}
          </div>
        )}

        {/* Next Button */}
        {selected !== null && (
          <button
            onClick={handleNext}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold"
          >
            {current + 1 >= quizzes.length ? "결과 보기" : "다음 문제"}
          </button>
        )}
      </div>
    </div>
  );
}
