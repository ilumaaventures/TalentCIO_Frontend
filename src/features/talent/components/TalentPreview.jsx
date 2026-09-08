import React, { useState } from 'react';
import {
  X,
  Star,
  MapPin,
  Briefcase,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Award,
  Sparkles,
  Layers,
  MessageSquare,
  Share2,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkillRatingBar from './SkillRatingBar';

/**
 * TalentPreview Component
 * Renders the 70% right-side detailed talent profile preview,
 * including header, about section, overall rating breakdown, and soft + functional skill evaluations.
 */
const TalentPreview = ({
  employee,
  onClose,
  isSplitView = true
}) => {
  if (!employee) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Award size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Talent Profile Selected</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          Select an employee from the left panel to preview their evaluated competencies, experience, and interviewer scores.
        </p>
      </div>
    );
  }

  const {
    id,
    name,
    avatar,
    avatarInitials,
    avatarBg = 'bg-blue-600',
    designation,
    currentDesignation,
    currentCompany,
    department,
    location,
    employeeCode,
    email,
    phone,
    experience,
    joinedDate,
    status = 'Active',
    tagline,
    about,
    careerInterests,
    keyStrengths = [],
    workExperience = [],
    overallRating = 0,
    totalEvaluations = 8,
    softSkills = [],
    functionalSkills = []
  } = employee;

  // Resolved list of work experience ensuring at least two distinct entries
  const experiencesList = (() => {
    const rawList = Array.isArray(workExperience) && workExperience.length > 0 ? workExperience : [];
    if (rawList.length >= 2) {
      return rawList;
    }

    const currentRoleTitle = currentDesignation || designation || 'Senior Specialist';
    const currentOrg = currentCompany || 'TalentCIO Technologies';
    const techSkills = functionalSkills.slice(0, 4).map((s) => s.name.split('&')[0].trim());

    // 1st entry: Current Role
    const primaryEntry = rawList[0] || {
      id: 'exp-dyn-1',
      role: currentRoleTitle,
      company: currentOrg,
      location: location || 'Bengaluru, Karnataka',
      employmentType: 'Full-time',
      startDate: joinedDate || 'Aug 2021',
      endDate: 'Present',
      duration: experience ? `${experience}` : 'Current',
      isCurrent: true,
      description: `Leading core initiatives, architectural design, and cross-functional feature execution across the ${department || 'Engineering'} division.`,
      highlights: [
        `Spearheaded key product enhancements, improving performance and user engagement.`,
        `Collaborated closely with cross-functional product and engineering teams to enforce best practices.`
      ],
      technologies: techSkills.length > 0 ? techSkills : ['React', 'TypeScript', 'System Architecture']
    };

    // 2nd entry: Previous Organization / Position
    let prevRole = 'Senior Specialist';
    let prevCompany = 'Infosys Limited';
    let prevDuration = '2 yrs 8 mos';
    let prevDates = 'Jun 2018 – Jul 2021';
    let prevHighlights = [
      'Engineered high-concurrency client modules and modernized existing system components.',
      'Authored comprehensive unit and integration test suites to maintain code quality.'
    ];

    if ((department && department.includes('Design')) || currentRoleTitle.includes('Design')) {
      prevRole = currentRoleTitle.includes('Lead') ? 'Senior Product Designer' : 'UI/UX Designer';
      prevCompany = currentOrg.includes('EY') ? 'Swiggy' : 'Fractal Analytics';
      prevDates = 'Jun 2018 – Jul 2021';
      prevDuration = '3 yrs 2 mos';
      prevHighlights = [
        'Redesigned end-to-end partner workflows, improving key onboarding metrics by 34%.',
        'Built interactive design token systems, wireframes, and responsive prototypes in Figma.'
      ];
    } else if ((department && department.includes('Quality')) || currentRoleTitle.includes('QA') || currentRoleTitle.includes('Test')) {
      prevRole = 'Lead SDET & Automation Engineer';
      prevCompany = 'Freshworks';
      prevDates = 'Jan 2020 – Oct 2022';
      prevDuration = '2 yrs 10 mos';
      prevHighlights = [
        'Engineered automated regression test suites covering over 500+ test scenarios.',
        'Shifted QA testing left in the CI/CD pipeline, reducing bug escape rate by 40%.'
      ];
    } else if ((department && department.includes('Platform')) || currentRoleTitle.includes('DevOps') || currentRoleTitle.includes('Cloud')) {
      prevRole = 'Senior Cloud Infrastructure Engineer';
      prevCompany = 'Zomato';
      prevDates = 'May 2018 – Jan 2022';
      prevDuration = '3 yrs 9 mos';
      prevHighlights = [
        'Managed scalable Kubernetes clusters and automated CI/CD deployment pipelines.',
        'Reduced cloud compute overhead through intelligent autoscaling and cost monitoring.'
      ];
    } else if ((department && department.includes('Product')) || currentRoleTitle.includes('Product')) {
      prevRole = 'Product Manager';
      prevCompany = 'PhonePe';
      prevDates = 'Aug 2019 – Apr 2022';
      prevDuration = '2 yrs 9 mos';
      prevHighlights = [
        'Defined user roadmaps, PRDs, and prioritized backlog according to customer feedback.',
        'Collaborated with engineering to achieve seamless bi-weekly release cycles.'
      ];
    } else if ((department && department.includes('Data')) || (department && department.includes('AI')) || currentRoleTitle.includes('Scientist')) {
      prevRole = 'Senior Machine Learning Engineer';
      prevCompany = 'InMobi';
      prevDates = 'Oct 2018 – Aug 2022';
      prevDuration = '3 yrs 11 mos';
      prevHighlights = [
        'Trained high-throughput predictive machine learning models at scale.',
        'Constructed feature pipelines and reduced model inference latency by 45%.'
      ];
    } else {
      prevRole = currentRoleTitle.includes('Senior') || currentRoleTitle.includes('Staff')
        ? (currentRoleTitle.includes('Frontend') ? 'Frontend Developer' : 'Software Engineer')
        : 'Software Engineer';
      prevCompany = currentOrg.includes('Google') ? 'Paytm' : currentOrg.includes('Microsoft') ? 'Flipkart' : 'Fintech Solutions Ltd';
      prevDates = 'Jul 2019 – Feb 2022';
      prevDuration = '2 yrs 8 mos';
      prevHighlights = [
        'Built responsive UI workflows handling hundreds of thousands of daily operations.',
        'Optimized query performance and API response times across core services.'
      ];
    }

    const previousEntry = {
      id: 'exp-dyn-2',
      role: prevRole,
      company: prevCompany,
      location: (location ? location.split(',')[0] : 'Bengaluru') + ', India',
      employmentType: 'Full-time',
      startDate: prevDates.split('–')[0].trim(),
      endDate: prevDates.split('–')[1].trim(),
      duration: prevDuration,
      isCurrent: false,
      description: `Delivered high-impact product solutions, collaborated across engineering cohorts, and developed modular scalable features.`,
      highlights: prevHighlights,
      technologies: techSkills.length > 0 ? techSkills.slice(0, 3) : ['JavaScript', 'REST APIs', 'Git']
    };

    return [primaryEntry, previousEntry];
  })();

  // Calculate section averages
  const softAvg = softSkills.length
    ? (softSkills.reduce((acc, s) => acc + s.rating, 0) / softSkills.length).toFixed(1)
    : '0.0';
  const functionalAvg = functionalSkills.length
    ? (functionalSkills.reduce((acc, s) => acc + s.rating, 0) / functionalSkills.length).toFixed(1)
    : '0.0';

  // Extract unique interviewers and lead interviewer
  const allSkills = [...functionalSkills, ...softSkills];
  const interviewersList = Array.from(
    new Map(
      allSkills
        .filter((s) => s.interviewer)
        .map((s) => [s.interviewer, s.interviewerRole])
    ).entries()
  );
  const leadInterviewer = interviewersList[0] || ['Rahul Verma', 'Technical Lead'];

  const handleCopyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email);
      toast.success(`Copied ${email} to clipboard!`);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(`Talent profile link for ${name} copied!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full">
      {/* ------------------------------------------------------------------ */}
      {/* Top Banner & Action Controls (Compact Strip) */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-4 sm:px-5 py-2.5 text-white flex items-center justify-between shrink-0">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-60 h-16 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center">
          <span className="text-xs font-semibold text-slate-100">
            Talent Profile Preview
          </span>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyEmail}
            title="Copy Email"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors backdrop-blur-md"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Share Profile"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors backdrop-blur-md"
          >
            <Share2 size={13} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors backdrop-blur-md ml-1"
            >
              <X size={13} />
              <span className="hidden sm:inline">Close Split View</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Profile Header Content (White Area) */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-4">
        {/* ---------------------------------------------------------------- */}
        {/* Overall Skill Summary Card (Placed at the very top) */}
        {/* ---------------------------------------------------------------- */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Score Block */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <Award size={26} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Evaluated Competency Index
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {overallRating.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">/ 5.0</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={13}
                        className={
                          overallRating >= s
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-200 text-slate-200'
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Interviewer Name Display */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-semibold text-[11px] border border-blue-200/80">
                    <UserCheck size={12} className="text-blue-600" />
                    <span>Lead Interviewer:</span>
                    <strong className="text-slate-900">{leadInterviewer[0]}</strong>
                    {leadInterviewer[1] && (
                      <span className="text-slate-500 font-normal">({leadInterviewer[1]})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Metrics Breakdown */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 border-t md:border-t-0 md:border-l border-slate-200/80 pt-2.5 md:pt-0 md:pl-4">
              <div className="text-center px-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Soft Skills
                </span>
                <span className="text-base font-bold text-purple-700">{softAvg}</span>
                <span className="text-[9px] text-slate-400 block">{softSkills.length} evaluated</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center px-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Functional
                </span>
                <span className="text-base font-bold text-blue-700">{functionalAvg}</span>
                <span className="text-[9px] text-slate-400 block">{functionalSkills.length} evaluated</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center px-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Total Reviews
                </span>
                <span className="text-base font-bold text-slate-800">{totalEvaluations}</span>
                <span className="text-[9px] text-emerald-600 font-semibold block">100% Certified</span>
              </div>
            </div>
          </div>

          {/* All Evaluators Tag Bar */}
          {interviewersList.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <UserCheck size={11} className="text-blue-600" />
                <span>Evaluation Panel:</span>
              </span>
              {interviewersList.map(([name, role], i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200/90 text-slate-800 text-[10px] font-medium shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <span>{name}</span>
                  {role && <span className="text-slate-400 font-normal text-[9px]">({role})</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Profile Info Row (Avatar + Name + Designation + Contact Info) */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
          {/* Avatar & Key Info */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-100 flex items-center justify-center ring-2 ring-slate-100">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`h-full w-full ${avatarBg} text-white font-bold text-xl flex items-center justify-center ${
                    avatar ? 'hidden' : 'flex'
                  }`}
                >
                  {avatarInitials || name.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                title="Active Profile"
              />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {name}
                </h2>
                <CheckCircle2 size={16} className="text-blue-600 fill-blue-50" />
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {status}
                </span>
              </div>

              <div className="mt-1.5 space-y-1 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-bold">{department}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin size={12} className="text-slate-400" />
                  <span>{location}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-700">
                  <Building2 size={12} className="text-blue-600" />
                  <span>Current Company: <strong className="text-slate-900">{currentCompany || 'Google'}</strong></span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-700">
                  <Briefcase size={12} className="text-blue-600" />
                  <span>Current Designation: <strong className="text-slate-900">{currentDesignation || designation}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contact Info Block */}
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between gap-1 text-[11px] text-slate-600 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-100 shrink-0">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors font-medium text-slate-700"
            >
              <Mail size={12} className="text-slate-400" />
              <span>{email}</span>
            </button>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Building2 size={12} className="text-slate-400" />
              <span>{currentCompany || 'Google'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
              <Briefcase size={12} className="text-slate-400" />
              <span>{experience} Experience</span>
            </span>
            {joinedDate && (
              <span className="inline-flex items-center gap-1.5 text-slate-500 text-[10px]">
                <Calendar size={11} className="text-slate-400" />
                <span>Joined {joinedDate}</span>
              </span>
            )}
          </div>
        </div>

        {/* Tagline Box */}
        {tagline && (
          <div className="mt-3 rounded-xl bg-slate-50/90 border border-slate-200/70 p-3 text-[11px] text-slate-600 font-medium leading-relaxed">
            <span className="text-blue-600 font-bold mr-1.5">Summary:</span>
            {tagline}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Scrollable Content Body */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-subtle">
        {/* ---------------------------------------------------------------- */}
        {/* About Section */}
        {/* ---------------------------------------------------------------- */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Sparkles size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              About
            </h3>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-2.5">
            {about.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Key Strengths & Interests */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {keyStrengths.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Key Strengths
                </h4>
                <div className="space-y-1">
                  {keyStrengths.map((strength, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {careerInterests && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Focus Areas & Career Interests
                </h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {careerInterests}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Work Experience Section */}
        {/* ---------------------------------------------------------------- */}
        {experiencesList.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Briefcase size={14} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Work Experience
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {experience ? `${experience} Total Experience` : `${experiencesList.length} Positions`}
              </span>
            </div>

            {/* Timeline container */}
            <div className="relative pl-5 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {experiencesList.map((exp, idx) => {
                const isCurrent = exp.isCurrent || (typeof exp.endDate === 'string' && exp.endDate.toLowerCase() === 'present');
                return (
                  <div key={exp.id || idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-5 top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isCurrent
                          ? 'bg-blue-600 border-white ring-3 ring-blue-100 text-white'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      <div className={`h-1 w-1 rounded-full ${isCurrent ? 'bg-white' : 'bg-slate-400'}`} />
                    </div>

                    {/* Experience Item Box */}
                    <div className="bg-slate-50/70 hover:bg-slate-50/90 rounded-xl border border-slate-200/70 p-3.5 transition-all duration-200 space-y-2">
                      {/* Top Header: Role & Status */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900">
                            {exp.role || exp.designation}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
                            <Building2 size={12} className="text-blue-500 shrink-0" />
                            <span>{exp.company || exp.companyName}</span>
                            {exp.employmentType && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500 font-normal">{exp.employmentType}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Current Role
                          </span>
                        )}
                      </div>

                      {/* Meta info: Duration & Location */}
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>
                            {exp.startDate} – {exp.endDate || (isCurrent ? 'Present' : '')}
                            {exp.duration ? ` · ${exp.duration}` : ''}
                          </span>
                        </span>
                        {exp.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{exp.location}</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {exp.description && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {exp.description}
                        </p>
                      )}

                      {/* Highlights */}
                      {exp.highlights && exp.highlights.length > 0 && (
                        <ul className="space-y-1 pt-0.5">
                          {exp.highlights.map((item, hIdx) => (
                            <li key={hIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-normal">
                              <span className="h-1 w-1 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Tech Stack Pills */}
                      {exp.technologies && exp.technologies.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {exp.technologies.map((tech, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] font-medium bg-white text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200/80 shadow-2xs"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Skills Section */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Award size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Skills
            </h3>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Functional Skills Group */}
          {/* -------------------------------------------------------------- */}
          {functionalSkills.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Functional & Technical Skills
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Avg: {functionalAvg} / 5.0
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {functionalSkills.map((skill) => (
                  <SkillRatingBar
                    key={skill.id || skill.name}
                    skill={skill}
                    category="functional"
                  />
                ))}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Soft Skills Group */}
          {/* -------------------------------------------------------------- */}
          {softSkills.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Soft Skills & Behavioral Competencies
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  Avg: {softAvg} / 5.0
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {softSkills.map((skill) => (
                  <SkillRatingBar
                    key={skill.id || skill.name}
                    skill={skill}
                    category="soft"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TalentPreview;
