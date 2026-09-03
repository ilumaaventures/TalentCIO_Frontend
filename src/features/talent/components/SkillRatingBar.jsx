import React from 'react';

/**
 * SkillRatingBar Component
 * Displays a single skill's name, category, and visual progress meter bar.
 */
const SkillRatingBar = ({
  skill,
  category = 'functional' // 'functional' | 'soft'
}) => {
  const {
    name,
    rating = 0,
    maxRating = 5
  } = skill;

  const percentage = Math.min(Math.max((rating / maxRating) * 100, 0), 100);

  // Gradient based on rating score
  const getRatingTheme = (score) => {
    if (score >= 4.7) {
      return {
        barGradient: 'from-emerald-500 to-teal-500'
      };
    }
    if (score >= 4.3) {
      return {
        barGradient: 'from-blue-600 to-indigo-600'
      };
    }
    if (score >= 3.8) {
      return {
        barGradient: 'from-amber-500 to-orange-500'
      };
    }
    return {
      barGradient: 'from-slate-500 to-slate-600'
    };
  };

  const theme = getRatingTheme(rating);

  return (
    <div className="group rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
      {/* Top Row: Skill Name */}
      <div className="mb-2.5">
        <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
          {name}
        </h4>
      </div>

      {/* Progress Meter Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${theme.barGradient} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default SkillRatingBar;
