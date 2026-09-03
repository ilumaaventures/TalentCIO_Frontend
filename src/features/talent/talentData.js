/**
 * Static Mock Data for Talent Profiles & Skill Evaluations
 * Designed with Indian employee profiles across diverse engineering, design, and product roles.
 * Structured cleanly to easily transition to API responses in the future.
 */

export const TALENT_PROFILES = [
  {
    id: 'emp-tal-001',
    name: 'Aarav Sharma',
    avatar: '/aarav-sharma.jpg',
    avatarInitials: 'AS',
    avatarBg: 'bg-blue-600',
    designation: 'Senior Frontend Engineer',
    currentDesignation: 'Senior Frontend Engineer',
    currentCompany: 'Google',
    department: 'Engineering',
    location: 'Bengaluru, Karnataka',
    employeeCode: 'TC-1042',
    email: 'aarav.sharma@talentcio.in',
    phone: '+91 98450 12389',
    experience: '6.5 Years',
    joinedDate: '15 Mar 2022',
    status: 'Active',
    tagline: 'Building scalable web applications with a focus on modern frontend architecture and intuitive user experience.',
    about: `Aarav is a seasoned frontend specialist with over six years of experience developing high-concurrency enterprise web platforms. He specializes in React, TypeScript, Next.js, and web performance optimization. Prior to TalentCIO, he led frontend modules for fintech workflows handling hundreds of thousands of transactions daily.

At TalentCIO, Aarav serves as the technical lead for core UI architecture, establishing strict TypeScript typing conventions, component design systems, and micro-frontend integrations. He is recognized for his pragmatic engineering approach, code quality advocacy, and dedication to mentoring junior developers.`,
    careerInterests: 'Design Systems, WebAssembly, Micro-frontend Architecture, and Real-Time Collaborative Canvas Apps.',
    keyStrengths: [
      'Component Architecture & Reusability',
      'Performance Profiling & Web Vitals Optimization',
      'Cross-functional Technical Mentorship',
      'Complex UI State Modeling'
    ],
    workExperience: [
      {
        id: 'exp-1-1',
        role: 'Senior Frontend Engineer',
        company: 'TalentCIO Technologies',
        location: 'Bengaluru, Karnataka (Hybrid)',
        employmentType: 'Full-time',
        startDate: 'Mar 2022',
        endDate: 'Present',
        duration: '4 yrs',
        isCurrent: true,
        description: 'Leading the core UI architecture, TypeScript typing conventions, and enterprise component design systems across the suite.',
        highlights: [
          'Architected the atomic design token library used across 12+ enterprise micro-apps.',
          'Reduced LCP render times by 42% through aggressive route-level code splitting.',
          'Spearheaded the migration of legacy dashboards to React 19 and TanStack Query.'
        ],
        technologies: ['React 19', 'TypeScript', 'Next.js', 'TailwindCSS', 'Redux Toolkit', 'TanStack Query']
      },
      {
        id: 'exp-1-2',
        role: 'Frontend Developer',
        company: 'Fintech Solutions Ltd',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        startDate: 'Jul 2019',
        endDate: 'Feb 2022',
        duration: '2 yrs 8 mos',
        isCurrent: false,
        description: 'Developed high-concurrency payment interfaces and merchant analytics dashboards.',
        highlights: [
          'Engineered real-time transaction monitoring dashboards handling 250k+ daily transactions.',
          'Integrated PCI-DSS compliant checkout flows with seamless 3DS payment verification.'
        ],
        technologies: ['React', 'JavaScript (ES6+)', 'Styled Components', 'Jest', 'Webpack']
      },
      {
        id: 'exp-1-3',
        role: 'Junior UI Engineer',
        company: 'Infosys Limited',
        location: 'Mysuru / Bengaluru',
        employmentType: 'Full-time',
        startDate: 'Aug 2017',
        endDate: 'Jun 2019',
        duration: '1 yr 11 mos',
        isCurrent: false,
        description: 'Built responsive client portal views for global banking and insurance clients.',
        highlights: [
          'Converted responsive wireframes into pixel-perfect accessible cross-browser UI components.'
        ],
        technologies: ['HTML5', 'CSS3', 'JavaScript', 'Bootstrap', 'jQuery']
      }
    ],
    overallRating: 4.9,
    totalEvaluations: 8,
    softSkills: [
      {
        id: 'ss-1',
        name: 'Technical Communication',
        rating: 4.9,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '12 Jan 2026',
        feedback: 'Articulates complex architectural trade-offs with extreme clarity; excellent at documenting system designs.'
      },
      {
        id: 'ss-2',
        name: 'Team Collaboration',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Priya Sundaram',
        interviewerRole: 'Product Lead',
        evaluationDate: '14 Jan 2026',
        feedback: 'Fosters high empathy across design and backend teams. Proactively unblocks peer developers during sprint crunches.'
      },
      {
        id: 'ss-3',
        name: 'Problem Solving & Ownership',
        rating: 5.0,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '18 Jan 2026',
        feedback: 'Demonstrates remarkable grit during production incidents; systematically tracks root causes and proposes preventive fixes.'
      },
      {
        id: 'ss-4',
        name: 'Mentorship & Knowledge Sharing',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Meera Joshi',
        interviewerRole: 'HRBP Lead',
        evaluationDate: '20 Jan 2026',
        feedback: 'Organizes bi-weekly frontend engineering brown-bag sessions and guides new hires seamlessly through onboarding.'
      }
    ],
    functionalSkills: [
      {
        id: 'fs-1',
        name: 'React & Next.js Architecture',
        rating: 5.0,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '10 Jan 2026',
        feedback: 'Mastery over React 19 hooks, concurrency features, Server Components, and zero-runtime CSS strategies.'
      },
      {
        id: 'fs-2',
        name: 'TypeScript & Type Systems',
        rating: 4.9,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '12 Jan 2026',
        feedback: 'Designs robust generic type schemas, ensuring type safety from backend DTOs straight to view layers.'
      },
      {
        id: 'fs-3',
        name: 'Web Performance & Core Web Vitals',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Karthik Raman',
        interviewerRole: 'Staff Performance Engineer',
        evaluationDate: '15 Jan 2026',
        feedback: 'Achieved sub-1.2s LCP and zero cumulative layout shift across client-heavy dashboards through aggressive code splitting.'
      },
      {
        id: 'fs-4',
        name: 'State Management & Caching',
        rating: 4.9,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '10 Jan 2026',
        feedback: 'Expert utilization of TanStack Query (React Query) and Redux Toolkit with resilient optimistic UI mutations.'
      }
    ]
  },
  {
    id: 'emp-tal-002',
    name: 'Ananya Iyer',
    avatar: '/ananya-iyer.jpg',
    avatarInitials: 'AI',
    avatarBg: 'bg-purple-600',
    designation: 'Lead Product Designer',
    currentDesignation: 'Lead Product Designer',
    currentCompany: 'EY (Ernst & Young)',
    department: 'Product & Design',
    location: 'Mumbai, Maharashtra',
    employeeCode: 'TC-1018',
    email: 'ananya.iyer@talentcio.in',
    phone: '+91 97120 44890',
    experience: '8.0 Years',
    joinedDate: '10 Aug 2021',
    status: 'Active',
    tagline: 'Crafting intuitive, accessible human-centered interfaces that turn complex enterprise workflows into delightful experiences.',
    about: `Ananya leads product design at TalentCIO, where she drives visual standards, user research methodologies, and enterprise design tokens across the entire suite. With a formal degree in Interaction Design from NID Ahmedabad and eight years in enterprise SaaS, she bridges product strategy and aesthetic precision.

Her philosophy centers on data-driven design validated by direct customer observation. Ananya spearheads the 'Design Tokens 2.0' initiative, establishing atomic accessibility standards and reducing handoff friction between design and engineering.`,
    careerInterests: 'Enterprise Design Systems, Generative AI Interaction Paradigms, Micro-Interactions, and WCAG AAA Accessibility.',
    keyStrengths: [
      'End-to-End User Experience Research',
      'High-Fidelity Interactive Prototyping',
      'Cross-Functional Design System Governance',
      'Accessibility & Usability Audits'
    ],
    workExperience: [
      {
        id: 'exp-2-1',
        role: 'Lead Product Designer',
        company: 'TalentCIO Technologies',
        location: 'Mumbai, Maharashtra (Hybrid)',
        employmentType: 'Full-time',
        startDate: 'Aug 2021',
        endDate: 'Present',
        duration: '4 yrs 7 mos',
        isCurrent: true,
        description: 'Spearheading product design strategy, Design Tokens 2.0 governance, and user research frameworks across all modules.',
        highlights: [
          'Created Design Tokens 2.0 system reducing frontend-design handoff overhead by 45%.',
          'Conducted over 60 customer discovery interviews with enterprise HR directors.',
          'Achieved WCAG 2.2 AA accessibility compliance across all web views.'
        ],
        technologies: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'WCAG AAA', 'Zeroheight']
      },
      {
        id: 'exp-2-2',
        role: 'Senior UI/UX Designer',
        company: 'Swiggy',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        startDate: 'Jun 2018',
        endDate: 'Jul 2021',
        duration: '3 yrs 2 mos',
        isCurrent: false,
        description: 'Led end-to-end user experience for partner onboarding and restaurant management tools.',
        highlights: [
          'Redesigned partner portal navigation, increasing onboarding task completion by 34%.',
          'Built micro-interactions and motion guidelines for the mobile merchant app.'
        ],
        technologies: ['Figma', 'Principle', 'Adobe XD', 'Usability Testing', 'Wireframing']
      },
      {
        id: 'exp-2-3',
        role: 'Interaction Designer',
        company: 'Fractal Analytics',
        location: 'Mumbai, Maharashtra',
        employmentType: 'Full-time',
        startDate: 'Jul 2016',
        endDate: 'May 2018',
        duration: '1 yr 11 mos',
        isCurrent: false,
        description: 'Designed interactive enterprise BI dashboards and predictive data visualizations.',
        highlights: [
          'Created modular chart visualization libraries for Fortune 500 retail clients.'
        ],
        technologies: ['Sketch', 'InVision', 'D3.js Mockups', 'Information Architecture']
      }
    ],
    overallRating: 4.6,
    totalEvaluations: 8,
    softSkills: [
      {
        id: 'ss-1',
        name: 'Design Advocacy & Storytelling',
        rating: 4.7,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '08 Jan 2026',
        feedback: 'Presents design rationales with compelling user research data and business impact narratives.'
      },
      {
        id: 'ss-2',
        name: 'Cross-Discipline Empathy',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '12 Jan 2026',
        feedback: 'Understands technical constraints deeply, crafting designs that are practical to build and scale.'
      },
      {
        id: 'ss-3',
        name: 'Stakeholder Facilitation',
        rating: 4.5,
        maxRating: 5.0,
        interviewer: 'Meera Joshi',
        interviewerRole: 'HRBP Lead',
        evaluationDate: '19 Jan 2026',
        feedback: 'Executes highly engaging Design Thinking workshops with executive stakeholders and international clients.'
      },
      {
        id: 'ss-4',
        name: 'Adaptability & Iteration Speed',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Priya Sundaram',
        interviewerRole: 'Product Lead',
        evaluationDate: '22 Jan 2026',
        feedback: 'Rapidly synthesizes customer feedback into iterated wireframes with impressive turnaround times.'
      }
    ],
    functionalSkills: [
      {
        id: 'fs-1',
        name: 'Figma & Design Systems',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Divya Sen',
        interviewerRole: 'Principal UX Strategist',
        evaluationDate: '09 Jan 2026',
        feedback: 'Industry-leading Figma mastery: variable modes, component properties, slot architecture, and token sync pipelines.'
      },
      {
        id: 'fs-2',
        name: 'User Research & Journey Mapping',
        rating: 4.5,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '08 Jan 2026',
        feedback: 'Conducts quantitative usability benchmarking and heuristic evaluations that directly boosted task completion by 34%.'
      },
      {
        id: 'fs-3',
        name: 'Interaction Design & Micro-Animations',
        rating: 4.7,
        maxRating: 5.0,
        interviewer: 'Divya Sen',
        interviewerRole: 'Principal UX Strategist',
        evaluationDate: '09 Jan 2026',
        feedback: 'Designs subtle physics-based transitions that create a tactile, premium software feel.'
      },
      {
        id: 'fs-4',
        name: 'Accessibility (WCAG 2.2 AA/AAA)',
        rating: 4.5,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '15 Jan 2026',
        feedback: 'Rigorous color contrast verification, screen reader semantic hierarchies, and focus indicator design.'
      }
    ]
  },
  {
    id: 'emp-tal-004',
    name: 'Priya Nair',
    avatar: '/priya-nair.jpg',
    avatarInitials: 'PN',
    avatarBg: 'bg-rose-600',
    designation: 'Senior QA & Automation Lead',
    currentDesignation: 'Senior QA & Automation Lead',
    currentCompany: 'Amazon',
    department: 'Quality Engineering',
    location: 'Kochi, Kerala',
    employeeCode: 'TC-1065',
    email: 'priya.nair@talentcio.in',
    phone: '+91 94470 99231',
    experience: '7.1 Years',
    joinedDate: '18 Nov 2022',
    status: 'Active',
    tagline: 'Driving zero-defect product quality through automated test harnesses, performance testing, and CI/CD quality gates.',
    about: `Priya leads quality automation and test strategy at TalentCIO. She brings seven years of experience orchestrating enterprise test frameworks using Playwright, Cypress, Jest, and k6. She is passionate about shifting testing left and embedding automated safety nets into developer workflows.

Under Priya's leadership, release regression cycles dropped from 3 days to under 45 minutes by implementing parallelized browser matrix runs and automated visual regression checks.`,
    careerInterests: 'AI-Powered Synthetic Test Data, Chaos Engineering, Contract Testing with Pact, and Mobile Test Automation.',
    keyStrengths: [
      'End-to-End Test Framework Engineering',
      'Visual Regression & Snapshot Auditing',
      'API Contract & Load Testing (k6 / Artillery)',
      'CI/CD Quality Gate Pipeline Integration'
    ],
    workExperience: [
      {
        id: 'exp-4-1',
        role: 'Senior QA & Automation Lead',
        company: 'TalentCIO Technologies',
        location: 'Kochi, Kerala (Hybrid)',
        employmentType: 'Full-time',
        startDate: 'Nov 2022',
        endDate: 'Present',
        duration: '3 yrs 4 mos',
        isCurrent: true,
        description: 'Directing automated testing strategies, Playwright test harnesses, and CI/CD quality gate integrations.',
        highlights: [
          'Reduced regression execution time from 3 days to under 45 minutes using parallel matrix workers.',
          'Automated 600+ end-to-end tests across Chromium, Firefox, and WebKit browsers.',
          'Embedded consumer-driven contract testing (Pact) across microservice endpoints.'
        ],
        technologies: ['Playwright', 'Cypress', 'Jest', 'k6', 'GitHub Actions', 'Pact', 'Docker']
      },
      {
        id: 'exp-4-2',
        role: 'Lead SDET',
        company: 'Freshworks',
        location: 'Chennai, Tamil Nadu',
        employmentType: 'Full-time',
        startDate: 'Jan 2020',
        endDate: 'Oct 2022',
        duration: '2 yrs 10 mos',
        isCurrent: false,
        description: 'Architected test automation suites for CRM and customer support products.',
        highlights: [
          'Designed visual snapshot regression suites preventing UI breakages across 40+ localization locales.',
          'Conducted simulated 50k virtual user stress testing runs using k6.'
        ],
        technologies: ['TypeScript', 'Selenium WebDriver', 'Cypress', 'Postman', 'k6']
      },
      {
        id: 'exp-4-3',
        role: 'QA Automation Engineer',
        company: 'Cognizant Technology Solutions',
        location: 'Kochi, Kerala',
        employmentType: 'Full-time',
        startDate: 'Jul 2017',
        endDate: 'Dec 2019',
        duration: '2 yrs 6 mos',
        isCurrent: false,
        description: 'Created automated regression testing scripts for enterprise banking applications.',
        highlights: [
          'Automated 200+ manual test cases using Java TestNG and Selenium.'
        ],
        technologies: ['Java', 'Selenium', 'TestNG', 'Jenkins', 'Jira']
      }
    ],
    overallRating: 4.3,
    totalEvaluations: 8,
    softSkills: [
      {
        id: 'ss-1',
        name: 'Meticulous Attention to Detail',
        rating: 4.5,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '13 Jan 2026',
        feedback: 'Uncovers edge-case permutations and concurrency race conditions that standard test plans miss.'
      },
      {
        id: 'ss-2',
        name: 'Constructive Quality Advocacy',
        rating: 4.2,
        maxRating: 5.0,
        interviewer: 'Priya Sundaram',
        interviewerRole: 'Product Lead',
        evaluationDate: '16 Jan 2026',
        feedback: 'Champions high software quality without bottlenecking sprint delivery velocity.'
      },
      {
        id: 'ss-3',
        name: 'Technical Writing & Bug Triage',
        rating: 4.4,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '19 Jan 2026',
        feedback: 'Produces defect reports with video recordings, network trace logs, and minimal reproduction steps.'
      },
      {
        id: 'ss-4',
        name: 'Cross-Team Training',
        rating: 4.1,
        maxRating: 5.0,
        interviewer: 'Meera Joshi',
        interviewerRole: 'HRBP Lead',
        evaluationDate: '23 Jan 2026',
        feedback: 'Trained 25+ frontend and backend developers on writing automated unit and integration tests.'
      }
    ],
    functionalSkills: [
      {
        id: 'fs-1',
        name: 'Playwright & E2E Automation',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '11 Jan 2026',
        feedback: 'Engineered a rock-solid, flaky-free Playwright test suite running over 600 tests across Chromium, Firefox, and WebKit.'
      },
      {
        id: 'fs-2',
        name: 'API Testing & Pact Contract Tests',
        rating: 4.3,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '13 Jan 2026',
        feedback: 'Implemented consumer-driven contract testing preventing breaking API schema changes across services.'
      },
      {
        id: 'fs-3',
        name: 'Load & Stress Testing (k6)',
        rating: 4.1,
        maxRating: 5.0,
        interviewer: 'Amitabh Sen',
        interviewerRole: 'Lead Platform Architect',
        evaluationDate: '18 Jan 2026',
        feedback: 'Executes simulated 50k virtual user stress runs to certify payroll and attendance batch calculation spikes.'
      },
      {
        id: 'fs-4',
        name: 'CI/CD Pipeline Quality Gates',
        rating: 4.2,
        maxRating: 5.0,
        interviewer: 'Aditya Kapoor',
        interviewerRole: 'Principal DevOps Engineer',
        evaluationDate: '20 Jan 2026',
        feedback: 'Integrated GitHub Actions status checks with automated test coverage threshold enforcement (>85%).'
      }
    ]
  },
  {
    id: 'emp-tal-005',
    name: 'Aditya Kapoor',
    avatar: '/aditya-kapoor.jpg',
    avatarInitials: 'AK',
    avatarBg: 'bg-amber-600',
    designation: 'Principal DevOps & Cloud Engineer',
    currentDesignation: 'Principal DevOps & Cloud Engineer',
    currentCompany: 'Flipkart',
    department: 'Platform Engineering',
    location: 'Gurugram, Haryana',
    employeeCode: 'TC-1029',
    email: 'aditya.kapoor@talentcio.in',
    phone: '+91 98110 55672',
    experience: '8.8 Years',
    joinedDate: '02 Feb 2022',
    status: 'Active',
    tagline: 'Automating immutable cloud infrastructure, multi-cluster Kubernetes, and zero-trust security postures.',
    about: `Aditya manages cloud infrastructure, automated provisioning, observability, and container orchestration across AWS and GCP environments. He holds AWS Certified Solutions Architect Professional and CKA (Certified Kubernetes Administrator) certifications.

At TalentCIO, Aditya engineered the migration to automated Terraform Infrastructure-as-Code, reduced cloud infrastructure expenditure by 28% through intelligent autoscaling policies, and configured Prometheus/Grafana alerting with 99.98% uptime SLA compliance.`,
    careerInterests: 'Service Mesh (Istio), GitOps (ArgoCD), eBPF-based Networking Observability, and FinOps Governance.',
    keyStrengths: [
      'Multi-Cloud Architecture (AWS / GCP)',
      'Kubernetes Cluster Orchestration & Helm',
      'Infrastructure as Code (Terraform / Terragrunt)',
      'Site Reliability & Automated Incident Remediation'
    ],
    workExperience: [
      {
        id: 'exp-5-1',
        role: 'Principal DevOps & Cloud Engineer',
        company: 'TalentCIO Technologies',
        location: 'Gurugram, Haryana (Hybrid)',
        employmentType: 'Full-time',
        startDate: 'Feb 2022',
        endDate: 'Present',
        duration: '4 yrs 1 mo',
        isCurrent: true,
        description: 'Managing cloud infrastructure, automated provisioning, Kubernetes orchestration, and GitOps CI/CD across AWS and GCP.',
        highlights: [
          'Migrated legacy infrastructure to modular Terraform IaC with zero production downtime.',
          'Reduced monthly AWS infrastructure expenditure by 28% through Karpenter intelligent autoscaling.',
          'Implemented Prometheus, Grafana, and Datadog distributed tracing with 99.98% SLA compliance.'
        ],
        technologies: ['AWS', 'Kubernetes (EKS)', 'Terraform', 'ArgoCD', 'Prometheus', 'Grafana', 'Helm', 'Docker']
      },
      {
        id: 'exp-5-2',
        role: 'Senior Cloud Infrastructure Engineer',
        company: 'Zomato',
        location: 'Gurugram, Haryana',
        employmentType: 'Full-time',
        startDate: 'May 2018',
        endDate: 'Jan 2022',
        duration: '3 yrs 9 mos',
        isCurrent: false,
        description: 'Managed high-traffic food delivery platform infrastructure and multi-region deployment clusters.',
        highlights: [
          'Scaled Kubernetes clusters handling peak lunch and dinner traffic spikes of 100k+ requests/sec.',
          'Maintained automated canary deployments with automated rollback triggers on error rate spikes.'
        ],
        technologies: ['AWS', 'Kubernetes', 'Terraform', 'Ansible', 'Datadog', 'Jenkins']
      },
      {
        id: 'exp-5-3',
        role: 'DevOps Engineer',
        company: 'Wipro Digital',
        location: 'Noida, Uttar Pradesh',
        employmentType: 'Full-time',
        startDate: 'Sep 2015',
        endDate: 'Apr 2018',
        duration: '2 yrs 8 mos',
        isCurrent: false,
        description: 'Built automated CI/CD pipelines and managed Linux server fleets for global enterprise clients.',
        highlights: [
          'Automated VM provisioning using Bash scripting and Ansible playbooks.'
        ],
        technologies: ['Linux (Ubuntu/CentOS)', 'Bash', 'Ansible', 'GitLab CI', 'Docker']
      }
    ],
    overallRating: 4.7,
    totalEvaluations: 8,
    softSkills: [
      {
        id: 'ss-1',
        name: 'Proactive Risk Assessment',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '07 Jan 2026',
        feedback: 'Anticipates cloud capacity constraints and security CVE exposures before they affect live production.'
      },
      {
        id: 'ss-2',
        name: 'Clear Communication in Crisis',
        rating: 4.7,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '12 Jan 2026',
        feedback: 'Delivers transparent, structured status updates during maintenance windows and system cutovers.'
      },
      {
        id: 'ss-3',
        name: 'Developer Experience Focus',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '14 Jan 2026',
        feedback: 'Builds self-service staging environment deployment tools that make dev workflows delightful.'
      },
      {
        id: 'ss-4',
        name: 'Knowledge Documentation',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Meera Joshi',
        interviewerRole: 'HRBP Lead',
        evaluationDate: '21 Jan 2026',
        feedback: 'Maintains comprehensive runbooks and disaster recovery step-by-step procedures.'
      }
    ],
    functionalSkills: [
      {
        id: 'fs-1',
        name: 'Kubernetes & Container Orchestration',
        rating: 4.9,
        maxRating: 5.0,
        interviewer: 'Amitabh Sen',
        interviewerRole: 'Lead Platform Architect',
        evaluationDate: '10 Jan 2026',
        feedback: 'Architected high-availability EKS clusters with Karpenter node autoscaling and Cilium CNI.'
      },
      {
        id: 'fs-2',
        name: 'Terraform & Infrastructure as Code',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '12 Jan 2026',
        feedback: 'Maintains modular, DRY Terraform codebases with automated Atlantis pull-request planning.'
      },
      {
        id: 'fs-3',
        name: 'CI/CD Pipelines & GitOps (ArgoCD)',
        rating: 4.7,
        maxRating: 5.0,
        interviewer: 'Amitabh Sen',
        interviewerRole: 'Lead Platform Architect',
        evaluationDate: '10 Jan 2026',
        feedback: 'Engineered GitOps continuous deployment pipeline with automated canary rollouts and rollback triggers.'
      },
      {
        id: 'fs-4',
        name: 'Observability (Prometheus / Grafana / Datadog)',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '07 Jan 2026',
        feedback: 'Comprehensive distributed tracing setup and actionable SLO/SLI error-budget alerting.'
      }
    ]
  },
  {
    id: 'emp-tal-006',
    name: 'Sneha Rao',
    avatar: '/sneha-rao.jpg',
    avatarInitials: 'SR',
    avatarBg: 'bg-teal-600',
    designation: 'Senior Product Manager',
    currentDesignation: 'Senior Product Manager',
    currentCompany: 'Adobe',
    department: 'Product Management',
    location: 'Hyderabad, Telangana',
    employeeCode: 'TC-1033',
    email: 'sneha.rao@talentcio.in',
    phone: '+91 96500 81290',
    experience: '7.5 Years',
    joinedDate: '12 May 2022',
    status: 'Active',
    tagline: 'Translating complex client business requirements into data-informed product roadmaps with rapid market validation.',
    about: `Sneha is the Product Manager overseeing Talent Acquisition and Employee Dossier modules. She combines an engineering undergraduate background with an MBA from IIM Kozhikode, bringing both technical fluency and commercial acumen to feature discovery.

She works closely with client HR heads, recruiter panels, and candidate pools to uncover unmet workflow challenges. Her data-driven product prioritization model has boosted user retention by 22% and reduced hiring cycle drop-offs across top enterprise accounts.`,
    careerInterests: 'Product-Led Growth (PLG), B2B SaaS Monetization, AI Copilot Workflow Integration, and Behavioral Analytics.',
    keyStrengths: [
      'Product Strategy & North Star Metric Definition',
      'PRD & User Story Specification',
      'Customer Discovery & Cohort Analytics',
      'Cross-Functional Agile Sprint Leadership'
    ],
    workExperience: [
      {
        id: 'exp-6-1',
        role: 'Senior Product Manager',
        company: 'TalentCIO Technologies',
        location: 'Hyderabad, Telangana (Hybrid)',
        employmentType: 'Full-time',
        startDate: 'May 2022',
        endDate: 'Present',
        duration: '3 yrs 10 mos',
        isCurrent: true,
        description: 'Directing product strategy, roadmap, and delivery for Talent Acquisition and Employee Dossier HRMS modules.',
        highlights: [
          'Boosted multi-tenant user retention by 22% by streamlining recruiter workflow UX.',
          'Formulated RICE prioritization frameworks aligning engineering squads and commercial targets.',
          'Spearheaded enterprise feature launches across 20+ Fortune 500 pilot client organizations.'
        ],
        technologies: ['Product Strategy', 'PRD & Roadmaps', 'Jira Agile', 'Mixpanel', 'PostHog', 'Figma']
      },
      {
        id: 'exp-6-2',
        role: 'Product Manager',
        company: 'PhonePe',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        startDate: 'Aug 2019',
        endDate: 'Apr 2022',
        duration: '2 yrs 9 mos',
        isCurrent: false,
        description: 'Managed merchant payment onboarding and automated settlement reconciliation features.',
        highlights: [
          'Decreased merchant verification turnaround time from 48 hours to 4 hours via automated KYC.',
          'Collaborated with engineering to build real-time transaction dispute settlement workflows.'
        ],
        technologies: ['Fintech Product', 'User Research', 'SQL', 'A/B Testing', 'Agile Scrum']
      },
      {
        id: 'exp-6-3',
        role: 'Associate Product Manager',
        company: 'Ola Cabs',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        startDate: 'Jul 2016',
        endDate: 'Jul 2019',
        duration: '3 yrs 1 mo',
        isCurrent: false,
        description: 'Owned driver partner incentives dashboard and rating feedback loops.',
        highlights: [
          'Improved driver app rating transparency, reducing support inquiry volume by 18%.'
        ],
        technologies: ['Mobile UX', 'SQL Queries', 'Cohort Analytics', 'Wireframing']
      }
    ],
    overallRating: 4.8,
    totalEvaluations: 8,
    softSkills: [
      {
        id: 'ss-1',
        name: 'Executive Communication',
        rating: 4.9,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '09 Jan 2026',
        feedback: 'Articulates product roadmaps and strategic trade-offs with poise before executive leadership and enterprise buyers.'
      },
      {
        id: 'ss-2',
        name: 'Customer Empathy & Interviewing',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Priya Sundaram',
        interviewerRole: 'Product Lead',
        evaluationDate: '15 Jan 2026',
        feedback: 'Conducts unbiased qualitative user interviews that consistently uncover non-obvious operational pain points.'
      },
      {
        id: 'ss-3',
        name: 'Conflict Resolution & Alignment',
        rating: 4.7,
        maxRating: 5.0,
        interviewer: 'Meera Joshi',
        interviewerRole: 'HRBP Lead',
        evaluationDate: '20 Jan 2026',
        feedback: 'Skillfully aligns differing viewpoints between sales, customer success, and engineering teams.'
      },
      {
        id: 'ss-4',
        name: 'Data-Driven Prioritization',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '22 Jan 2026',
        feedback: 'Rigorously applies RICE scoring frameworks to ensure engineering cycles are spent on high-ROI features.'
      }
    ],
    functionalSkills: [
      {
        id: 'fs-1',
        name: 'Product Roadmap & Discovery',
        rating: 4.9,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '09 Jan 2026',
        feedback: 'Defines multi-quarter product roadmaps with clear quarterly OKRs and traceable business outcome milestones.'
      },
      {
        id: 'fs-2',
        name: 'Product Analytics & SQL',
        rating: 4.7,
        maxRating: 5.0,
        interviewer: 'Vikram Malhotra',
        interviewerRole: 'Lead Data Scientist',
        evaluationDate: '14 Jan 2026',
        feedback: 'Proficient in PostHog, Mixpanel, and raw PostgreSQL queries for cohort retention and funnel drop-off analysis.'
      },
      {
        id: 'fs-3',
        name: 'Agile / Scrum Product Ownership',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '16 Jan 2026',
        feedback: 'Writes exceptionally clear acceptance criteria, edge cases, and user flow diagrams for engineering squads.'
      },
      {
        id: 'fs-4',
        name: 'Go-to-Market & Feature Launch',
        rating: 4.8,
        maxRating: 5.0,
        interviewer: 'Priya Sundaram',
        interviewerRole: 'Product Lead',
        evaluationDate: '15 Jan 2026',
        feedback: 'Coordinates seamless feature releases with marketing collateral, sales enablement, and in-app walk-through guides.'
      }
    ]
  },
  {
    id: 'emp-tal-007',
    name: 'Vikram Malhotra',
    avatar: '/vikram-malhotra.jpg',
    avatarInitials: 'VM',
    avatarBg: 'bg-indigo-600',
    designation: 'Lead Data Scientist & AI Engineer',
    currentDesignation: 'Lead Data Scientist & AI Engineer',
    currentCompany: 'Razorpay',
    department: 'AI & Data Science',
    location: 'Noida, Uttar Pradesh',
    employeeCode: 'TC-1051',
    email: 'vikram.malhotra@talentcio.in',
    phone: '+91 98180 77410',
    experience: '8.3 Years',
    joinedDate: '19 Sep 2022',
    status: 'Active',
    tagline: 'Designing LLM reasoning pipelines, semantic candidate ranking, and predictive employee retention analytics.',
    about: `Vikram heads AI and machine learning initiatives at TalentCIO. Holding an M.Tech in Computer Science from IIT Delhi, he specializes in Large Language Model (LLM) fine-tuning, retrieval-augmented generation (RAG), vector embeddings, and predictive attrition modeling.

He built TalentCIO's smart resume parsing and candidate-job matching engine, cutting recruiter screening time by 60% while maintaining strict anti-bias fairness benchmarks.`,
    careerInterests: 'RAG Architecture, Local LLM Quantization, Agentic Workflows, and Explainable AI (XAI).',
    keyStrengths: [
      'Natural Language Processing & RAG Pipelines',
      'Predictive Modeling & Statistical Inference',
      'Python, PyTorch, LangChain & Vector Databases',
      'Ethical AI & Bias Mitigation Frameworks'
    ],
    workExperience: [
      {
        id: 'exp-7-1',
        role: 'Lead Data Scientist & AI Engineer',
        company: 'TalentCIO Technologies',
        location: 'Noida, Uttar Pradesh (Remote)',
        employmentType: 'Full-time',
        startDate: 'Sep 2022',
        endDate: 'Present',
        duration: '3 yrs 6 mos',
        isCurrent: true,
        description: 'Heading machine learning and GenAI initiatives, fine-tuning LLMs, and building intelligent talent-matching pipelines.',
        highlights: [
          'Engineered semantic resume parsing & job matching engine reducing recruiter screening time by 60%.',
          'Constructed hybrid dense-sparse vector search using Qdrant and LangChain with custom chunking.',
          'Trained predictive employee flight-risk models with 87% accuracy 90 days before attrition.'
        ],
        technologies: ['Python', 'PyTorch', 'LangChain', 'Qdrant Vector DB', 'LLM Fine-Tuning', 'FastAPI', 'Docker']
      },
      {
        id: 'exp-7-2',
        role: 'Senior Machine Learning Engineer',
        company: 'InMobi',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        startDate: 'Oct 2018',
        endDate: 'Aug 2022',
        duration: '3 yrs 11 mos',
        isCurrent: false,
        description: 'Developed real-time ad recommendation algorithms and audience targeting models.',
        highlights: [
          'Built deep CTR prediction models processing 200k queries per second at sub-20ms latency.',
          'Optimized inference latency with TensorRT and FP16 model quantization.'
        ],
        technologies: ['Python', 'TensorFlow', 'Scikit-Learn', 'Kafka', 'Spark MLlib', 'AWS SageMaker']
      },
      {
        id: 'exp-7-3',
        role: 'Data Science Associate',
        company: 'Mu Sigma',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        startDate: 'Jul 2015',
        endDate: 'Sep 2018',
        duration: '3 yrs 3 mos',
        isCurrent: false,
        description: 'Performed predictive analytics, statistical hypothesis testing, and churn forecasting.',
        highlights: [
          'Developed customer lifetime value forecasting models for global retail conglomerates.'
        ],
        technologies: ['Python', 'R', 'SQL', 'Tableau', 'Statistical Analysis']
      }
    ],
    overallRating: 4.4,
    totalEvaluations: 8,
    softSkills: [
      {
        id: 'ss-1',
        name: 'Translating AI to Business Value',
        rating: 4.5,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '11 Jan 2026',
        feedback: 'De-mystifies complex neural architectures into tangible customer outcomes and efficiency metrics.'
      },
      {
        id: 'ss-2',
        name: 'Scientific Rigor & Experimentation',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '13 Jan 2026',
        feedback: 'Enforces strict A/B testing standards, control groups, and statistical significance validation.'
      },
      {
        id: 'ss-3',
        name: 'Collaboration with Engineering',
        rating: 4.3,
        maxRating: 5.0,
        interviewer: 'Rahul Verma',
        interviewerRole: 'Engineering Director',
        evaluationDate: '17 Jan 2026',
        feedback: 'Packages ML models cleanly as containerized inference microservices ready for production deployment.'
      },
      {
        id: 'ss-4',
        name: 'Continuous Learning Drive',
        rating: 4.5,
        maxRating: 5.0,
        interviewer: 'Meera Joshi',
        interviewerRole: 'HRBP Lead',
        evaluationDate: '24 Jan 2026',
        feedback: 'Constantly explores cutting-edge research papers and prototypes novel AI workflows rapidly.'
      }
    ],
    functionalSkills: [
      {
        id: 'fs-1',
        name: 'LLM Fine-Tuning & RAG Pipelines',
        rating: 4.6,
        maxRating: 5.0,
        interviewer: 'Siddharth Sen',
        interviewerRole: 'VP of Technology',
        evaluationDate: '13 Jan 2026',
        feedback: 'Engineered hybrid dense-sparse vector search using Qdrant and LangChain with custom chunking algorithms.'
      },
      {
        id: 'fs-2',
        name: 'Python, PyTorch & Scikit-Learn',
        rating: 4.4,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '15 Jan 2026',
        feedback: 'Deep proficiency in GPU-accelerated tensor computations, custom loss functions, and model quantization.'
      },
      {
        id: 'fs-3',
        name: 'Predictive Modeling & Attrition Analysis',
        rating: 4.3,
        maxRating: 5.0,
        interviewer: 'Rakesh Nair',
        interviewerRole: 'Chief Product Officer',
        evaluationDate: '11 Jan 2026',
        feedback: 'Designed gradient-boosted decision trees that accurately identify flight risks 90 days prior to turnover.'
      },
      {
        id: 'fs-4',
        name: 'Data Pipelines & Feature Stores',
        rating: 4.2,
        maxRating: 5.0,
        interviewer: 'Vikramaditya Roy',
        interviewerRole: 'Principal Architect',
        evaluationDate: '17 Jan 2026',
        feedback: 'Built streaming feature extraction pipelines integrating PostgreSQL events and ML feature registries.'
      }
    ]
  }
];

export const DEPARTMENTS = [
  'All',
  'Engineering',
  'Product & Design',
  'Quality Engineering',
  'Platform Engineering',
  'Product Management',
  'AI & Data Science'
];

export const getTalentStats = (profiles = TALENT_PROFILES) => {
  const total = profiles.length;
  const avgRating = (profiles.reduce((acc, p) => acc + p.overallRating, 0) / (total || 1)).toFixed(1);
  const totalEvaluations = profiles.reduce((acc, p) => acc + (p.softSkills.length + p.functionalSkills.length), 0);
  const departments = [...new Set(profiles.map(p => p.department))].length;

  return {
    total,
    avgRating,
    totalEvaluations,
    departments
  };
};
