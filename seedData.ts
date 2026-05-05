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
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Starting demonstration data seeding...");
  
  // Keep track of IDs
  const users = {
    safaricom: '',
    kcb: '',
    pendingCompany: '',
    supervisorEgerton: '',
    pendingSupervisor: '',
    studentAlice: '',
    studentBob: '',
    studentCharlie: ''
  };

  const usersToCreate = [
    // Companies (Approved)
    {
      key: 'safaricom',
      email: 'hr@safaricom.co.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'company', name: 'James Kamau', company_name: 'Safaricom PLC', phone_number: '+254722000000', kra_pin: 'P051000000A', company_reg_number: 'PVT-123456', county: 'Nairobi', town: 'Westlands', building: 'Safaricom House', online_presence: 'safaricom.co.ke' },
      autoApprove: true
    },
    {
      key: 'kcb',
      email: 'careers@kcbgroup.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'company', name: 'Sarah Ochieng', company_name: 'Kenya Commercial Bank (KCB)', phone_number: '+254711000000', kra_pin: 'P052000000B', company_reg_number: 'PVT-654321', county: 'Nairobi', town: 'CBD', building: 'Kencom House', online_presence: 'kcbgroup.com' },
      autoApprove: true
    },
    // Company (Pending Approval)
    {
      key: 'pendingCompany',
      email: 'contact@bensolutions.co.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'company', name: 'Ben Mutua', company_name: 'BenSolutions Tech', phone_number: '+254700111222', kra_pin: 'P053000000C', company_reg_number: 'PVT-987654', county: 'Mombasa', town: 'Mvita', building: 'TSS Tower', online_presence: '' },
      autoApprove: false
    },
    // Supervisors
    {
      key: 'supervisorEgerton',
      email: 'supervisor1@egerton.ac.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'supervisor', name: 'Dr. John Doe', university: 'Egerton University', staff_number: 'EMP-1002', department: 'Computer Science', phone_number: '+254733000000' },
      autoApprove: true
    },
    {
      key: 'pendingSupervisor',
      email: 'supervisor@ku.ac.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'supervisor', name: 'Prof. Bruce Wayne', university: 'Kenyatta University', staff_number: 'EMP-3001', department: 'Math', phone_number: '+254722000222' },
      autoApprove: false
    },
    // Students
    {
      key: 'studentAlice',
      email: 'alice.johnson@student.egerton.ac.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'student', name: 'Alice Johnson', university: 'Egerton University', reg_no: 'S11/00010/24', phone_number: '+254722333444' },
      autoApprove: true
    },
    {
      key: 'studentBob',
      email: 'bob.williams@student.egerton.ac.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'student', name: 'Bob Williams', university: 'Egerton University', reg_no: 'S12/00011/24', phone_number: '+254755666777' },
      autoApprove: true
    },
    {
      key: 'studentCharlie',
      email: 'charlie.brown@student.uonbi.ac.ke',
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'student', name: 'Charlie Brown', university: 'University of Nairobi', reg_no: 'E35/2091/2024', phone_number: '+254799000111' },
      autoApprove: true
    }
  ];

  for (const u of usersToCreate) {
    const { data: listData } = await supabase.auth.admin.listUsers();
    let user = listData?.users.find((x: any) => x.email === u.email);
    
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: u.email_confirm,
        user_metadata: u.user_metadata
      });
      if (error) {
        console.error(`Failed to create ${u.email}:`, error.message);
      } else if (data && data.user) {
        console.log(`Created user ${u.email}`);
        user = data.user as any;
      }
    } else {
      console.log(`User ${u.email} already exists.`);
    }

    if (user) {
      (users as any)[u.key as keyof typeof users] = user.id;

      if (u.autoApprove) {
        await supabase.from('base_profiles').update({ approved: true }).eq('id', user.id);
      }
    }
  }

  // Create Opportunities
  console.log("Creating opportunities...");
  
  if (!users.safaricom || !users.kcb) return;

  const demoOpps = [
    {
      company_id: users.safaricom,
      company_name: 'Safaricom PLC',
      title: 'DevOps & Cloud Intern',
      description: 'Join Safaricom Cloud Computing department. Gain experience scaling Kubernetes clusters and managing CI/CD pipelines.',
      requirements: 'Knowledge in Linux, Basic Docker and Cloud concepts. Computer Science or IT major.',
      location: 'Nairobi / Remote',
      max_positions: 5,
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      is_paid: true,
      tags: ['Cloud', 'DevOps', 'Networking']
    },
    {
      company_id: users.safaricom,
      company_name: 'Safaricom PLC',
      title: 'Software Engineering Attachment',
      description: 'A 3-month industrial attachment for continuing university students. Work within the M-PESA Daraja API teams.',
      requirements: 'Experience with Node.js and REST APIs. Continuing 3rd or 4th year student.',
      location: 'Safaricom House, Westlands',
      max_positions: 10,
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_paid: false,
      tags: ['Engineering', 'Node.js', 'Fintech']
    },
    {
      company_id: users.kcb,
      company_name: 'Kenya Commercial Bank (KCB)',
      title: 'Cybersecurity Intern',
      description: 'As part of our risk management and cybersecurity framework, we are seeking sharp interns to assist with penetration testing and log analysis.',
      requirements: 'Must have understanding of OWASP Top 10, Network Security protocols.',
      location: 'Nairobi',
      max_positions: 2,
      start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      is_paid: true,
      tags: ['Security', 'Finance', 'On-site']
    }
  ];

  for (const opp of demoOpps) {
    // Check if opp exists
    const { data: existingOpps } = await supabase.from('opportunities').select('id').eq('title', opp.title).eq('company_id', opp.company_id);
    if (!existingOpps || existingOpps.length === 0) {
      await supabase.from('opportunities').insert(opp);
    }
  }

  // Create Applications
  if (users.studentAlice && users.studentBob) {
    const { data: safOpps } = await supabase.from('opportunities').select('id').eq('title', 'Software Engineering Attachment').eq('company_id', users.safaricom);
    
    if (safOpps && safOpps.length > 0) {
      const oppId = safOpps[0].id;
      
      const { data: existingApp } = await supabase.from('applications').select('id').eq('student_id', users.studentAlice).eq('opportunity_id', oppId);
      if (!existingApp || existingApp.length === 0) {
        await supabase.from('applications').insert({
          opportunity_id: oppId,
          student_id: users.studentAlice,
          student_name: 'Alice Johnson',
          student_email: 'alice.johnson@student.egerton.ac.ke',
          cv_url: 'https://internova-storage.placeholder/alice_cv.pdf',
          status: 'accepted'
        });
      }

      const { data: existingApp2 } = await supabase.from('applications').select('id').eq('student_id', users.studentBob).eq('opportunity_id', oppId);
      if (!existingApp2 || existingApp2.length === 0) {
        await supabase.from('applications').insert({
          opportunity_id: oppId,
          student_id: users.studentBob,
          student_name: 'Bob Williams',
          student_email: 'bob.williams@student.egerton.ac.ke',
          cv_url: 'https://internova-storage.placeholder/bob_cv.pdf',
          status: 'pending'
        });
      }
    }
  }

  console.log("Seeding complete! You can now log in with the generated accounts:");
  for(const u of usersToCreate) {
    console.log(`- ${u.email} / ${u.password} (${u.user_metadata.role}${u.autoApprove ? '' : ' - PENDING ADMIN APPROVAL'})`);
  }
}

main();
