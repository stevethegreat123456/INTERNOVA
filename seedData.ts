import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedData() {
  console.log("Starting data seeding...");

  try {
    // 1. Create Users
    console.log("Creating users...");
    
    const usersToCreate = [
      {
        email: 'admin@internova.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Admin User', role: 'admin' }
      },
      {
        email: 'company@techcorp.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Tech Corp', role: 'company' }
      },
      {
        email: 'company@datalab.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Data Lab Inc', role: 'company' }
      },
      {
        email: 'company@globalinnovations.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Global Innovations', role: 'company' }
      },
      {
        email: 'company@fintech.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'FinTech Solutions', role: 'company' }
      },
      {
        email: 'company@healthsync.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'HealthSync', role: 'company' }
      },
      {
        email: 'supervisor@university.edu',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Dr. Smith', role: 'university_supervisor' }
      },
      {
        email: 'student1@university.edu',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Alice Student', role: 'student' }
      },
      {
        email: 'student2@university.edu',
        password: 'password123',
        email_confirm: true,
        user_metadata: { name: 'Bob Intern', role: 'student' }
      }
    ];

    const createdUsers: Record<string, string> = {};

    for (const u of usersToCreate) {
      // check if exists first? Or just create. We can try deleting first or just creating and catching error if exists
      // Actually Admin API doesn't have an easy "find user by email" without listing, but we can just create and if it fails, oh well (or we delete first).
      
      // Attempt to delete if we want a fresh start? Let's just create.
      const { data, error } = await supabase.auth.admin.createUser(u);
      
      if (error) {
        if (error.message.includes('already been registered')) {
          console.log(`User ${u.email} already exists.`);
          // fetch user list to get ID
          const { data: listData } = await supabase.auth.admin.listUsers();
          const user = listData?.users.find(x => x.email === u.email);
          if (user) {
            createdUsers[u.email] = user.id;
          }
        } else {
          console.error(`Failed to create ${u.email}:`, error);
        }
      } else if (data && data.user) {
        console.log(`Created user ${u.email}`);
        createdUsers[u.email] = data.user.id;
      }
    }

    const techCorpId = createdUsers['company@techcorp.com'];
    const dataLabId = createdUsers['company@datalab.com'];
    const globalInnovationsId = createdUsers['company@globalinnovations.com'];
    const fintechId = createdUsers['company@fintech.com'];
    const healthsyncId = createdUsers['company@healthsync.com'];
    const aliceId = createdUsers['student1@university.edu'];
    
    if (!techCorpId || !dataLabId || !globalInnovationsId || !fintechId || !healthsyncId || !aliceId) {
      console.log("Could not resolve all required user IDs. Stopping seed.");
      return;
    }

    // 2. Clear some existing dummy data? Or just insert new. Let's just insert new.
    console.log("Creating opportunities...");
    const opportunities = [
      {
        company_id: techCorpId,
        company_name: 'Tech Corp',
        title: 'Frontend Engineering Intern',
        description: 'Join our frontend team to build modern React applications. You will learn state management, component architecture, and responsive design.',
        requirements: 'Experience with HTML, CSS, JS. Familiarity with React is a plus.',
        location: 'Remote',
        max_positions: 2,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // starts in 7 days
        is_paid: true,
        tags: ['Frontend', 'React', 'Remote']
      },
      {
        company_id: techCorpId,
        company_name: 'Tech Corp',
        title: 'Backend Developer Attachment',
        description: 'Work with Node.js and PostgreSQL. Build scalable APIs.',
        requirements: 'Knowledge of HTTP, REST, Node.js.',
        location: 'Nairobi, Kenya',
        max_positions: 1,
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // started 7 days ago
        is_paid: true,
        tags: ['Backend', 'Node.js', 'On-site']
      },
      {
        company_id: dataLabId,
        company_name: 'Data Lab Inc',
        title: 'Data Science Intern',
        description: 'Assist in data cleaning, exploratory data analysis, and building machine learning models.',
        requirements: 'Python, Pandas, basic stats knowledge.',
        location: 'Remote',
        max_positions: 3,
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // starts in 14 days
        is_paid: false,
        tags: ['Data Science', 'Python', 'Remote']
      },
      {
        company_id: globalInnovationsId,
        company_name: 'Global Innovations',
        title: 'Product Management Intern',
        description: 'Help shape the future of our enterprise software. Work closely with engineering and design teams.',
        requirements: 'Strong communication skills, analytical thinking, background in CS or Business.',
        location: 'London, UK',
        max_positions: 1,
        start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        is_paid: true,
        tags: ['Product', 'Management', 'Enterprise']
      },
      {
        company_id: globalInnovationsId,
        company_name: 'Global Innovations',
        title: 'UX/UI Design Attachment',
        description: 'Design intuitive interfaces and create wireframes, prototypes, and user flows.',
        requirements: 'Figma proficiency, understanding of user-centered design principles.',
        location: 'London, UK / Hybrid',
        max_positions: 2,
        start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        is_paid: true,
        tags: ['Design', 'UX/UI', 'Figma']
      },
      {
        company_id: fintechId,
        company_name: 'FinTech Solutions',
        title: 'Cybersecurity Intern',
        description: 'Join our sec-ops team to monitor threats, conduct vulnerability assessments, and improve our security posture.',
        requirements: 'Knowledge of network security, ethical hacking, or compliance standards.',
        location: 'Remote',
        max_positions: 1,
        start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        is_paid: true,
        tags: ['Security', 'Cybersecurity', 'Remote']
      },
      {
        company_id: fintechId,
        company_name: 'FinTech Solutions',
        title: 'Software Engineer - Mobile',
        description: 'Develop features for our mobile banking application using React Native.',
        requirements: 'React Native, JavaScript, understanding of mobile app lifecycles.',
        location: 'Remote',
        max_positions: 2,
        start_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        is_paid: true,
        tags: ['Mobile', 'React Native', 'Fintech']
      },
      {
        company_id: healthsyncId,
        company_name: 'HealthSync',
        title: 'Bioinformatics Analyst Intern',
        description: 'Analyze genomic data sets to support our healthcare research initiatives.',
        requirements: 'R, Python, understanding of biological data, statistics.',
        location: 'Boston, MA',
        max_positions: 1,
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_paid: true,
        tags: ['Bioinformatics', 'Data', 'Healthcare']
      },
      {
        company_id: healthsyncId,
        company_name: 'HealthSync',
        title: 'DevOps Engineering Intern',
        description: 'Work with AWS, Docker, and Kubernetes to scale our infrastructure securely.',
        requirements: 'Basic understanding of cloud platforms, CI/CD, Linux.',
        location: 'Remote',
        max_positions: 1,
        start_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        is_paid: true,
        tags: ['DevOps', 'AWS', 'Remote']
      }
    ];

    const { data: insertedOpps, error: oppsError } = await supabase
      .from('opportunities')
      .insert(opportunities)
      .select();

    if (oppsError) {
      console.error("Failed to insert opportunities:", oppsError);
    } else {
      console.log(`Inserted ${insertedOpps.length} opportunities.`);
    }

    const techCorpBackendOpp = insertedOpps?.find(o => o.title.includes('Backend'));
    
    // 3. Create Applications
    console.log("Creating applications...");
    if (techCorpBackendOpp) {
      const { data: insertedApp, error: appError } = await supabase
        .from('applications')
        .insert({
          opportunity_id: techCorpBackendOpp.id,
          student_id: aliceId,
          student_name: 'Alice Student',
          student_email: 'student1@university.edu',
          cv_url: 'https://example.com/alice-cv.pdf',
          status: 'accepted'
        })
        .select()
        .single();

      if (appError) {
        console.error("Failed to insert application:", appError);
      } else {
        console.log("Inserted application and set status to accepted.");
      }
    }

    console.log("Seeding complete! You can now log in with the following accounts:");
    console.log("- admin@internova.com / password123");
    console.log("- company@techcorp.com / password123");
    console.log("- company@datalab.com / password123");
    console.log("- company@globalinnovations.com / password123");
    console.log("- company@fintech.com / password123");
    console.log("- company@healthsync.com / password123");
    console.log("- student1@university.edu / password123");
    console.log("- supervisor@university.edu / password123");

  } catch (err) {
    console.error("Unexpected error during seeding:", err);
  }
}

seedData();
