export interface Opportunity {
  id: string;
  companyId: string;
  company_id?: string;
  companyName: string;
  company_name?: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  createdAt: string;
  created_at?: string;
  max_positions?: number;
  start_date?: string;
  is_paid?: boolean;
  tags?: string[];
}

export interface Application {
  id: string;
  opportunityId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  cvUrl?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'shortlisted';
  appliedAt: string;
}

class MockDB {
  private initialized = false;

  constructor() {
    this.initSeedData();
  }

  private initSeedData() {
    if (localStorage.getItem('internova_opportunities')) return;
    
    // Seed some initial opportunities
    const id1 = Math.random().toString(36).substring(2, 9);
    const id2 = Math.random().toString(36).substring(2, 9);
    
    this.set('opportunities', [
      {
        id: id1,
        companyId: 'seed-company-1',
        companyName: 'Tech Corp',
        title: 'Frontend Engineering Intern',
        description: 'Join our team to build scalable web applications using React and TypeScript.',
        requirements: 'Experience with React, Tailwind, and a strong understanding of web fundamentals.',
        location: 'Remote',
        createdAt: new Date().toISOString(),
      },
      {
        id: id2,
        companyId: 'seed-company-1',
        companyName: 'Tech Corp',
        title: 'Data Science Intern',
        description: 'Help us analyze user behavior and build predictive models.',
        requirements: 'Python, SQL, and basic knowledge of machine learning algorithms.',
        location: 'Nairobi, Kenya',
        createdAt: new Date().toISOString(),
      }
    ]);
  }

  private get<T>(key: string): T[] {
    const data = localStorage.getItem(`internova_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private set<T>(key: string, data: T[]) {
    localStorage.setItem(`internova_${key}`, JSON.stringify(data));
  }

  // Opportunities
  getOpportunities(): Opportunity[] {
    return this.get<Opportunity>('opportunities');
  }

  getOpportunitiesByCompany(companyId: string): Opportunity[] {
    return this.getOpportunities().filter(o => o.companyId === companyId);
  }

  addOpportunity(opp: Omit<Opportunity, 'id' | 'createdAt'>): Opportunity {
    const opps = this.getOpportunities();
    const newOpp: Opportunity = {
      ...opp,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    this.set('opportunities', [...opps, newOpp]);
    return newOpp;
  }

  deleteOpportunity(id: string) {
    const opps = this.getOpportunities().filter(o => o.id !== id);
    this.set('opportunities', opps);
    // Also delete related applications
    const apps = this.getApplications().filter(a => a.opportunityId !== id);
    this.set('applications', apps);
  }

  // Applications
  getApplications(): Application[] {
    return this.get<Application>('applications');
  }

  getApplicationsByStudent(studentId: string): Application[] {
    return this.getApplications().filter(a => a.studentId === studentId);
  }

  getApplicationsByCompany(companyId: string): (Application & { opportunityTitle: string })[] {
    const opps = this.getOpportunitiesByCompany(companyId);
    const oppIds = opps.map(o => o.id);
    const apps = this.getApplications().filter(a => oppIds.includes(a.opportunityId));
    
    return apps.map(app => {
      const opp = opps.find(o => o.id === app.opportunityId);
      return {
        ...app,
        opportunityTitle: opp?.title || 'Unknown Role'
      };
    });
  }

  applyForOpportunity(app: Omit<Application, 'id' | 'status' | 'appliedAt'>): Application {
    const apps = this.getApplications();
    const newApp: Application = {
      ...app,
      id: Math.random().toString(36).substring(2, 9),
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };
    this.set('applications', [...apps, newApp]);
    return newApp;
  }

  updateApplicationStatus(id: string, status: Application['status']) {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === id);
    if (idx !== -1) {
      apps[idx].status = status;
      this.set('applications', apps);
    }
  }
}

export const db = new MockDB();
