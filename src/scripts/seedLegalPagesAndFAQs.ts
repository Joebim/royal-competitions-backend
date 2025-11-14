import { connectDatabase, disconnectDatabase } from '../config/database';
import { LegalPage, FAQ, User, UserRole } from '../models';
import logger from '../utils/logger';

/**
 * Seed script to create legal pages and FAQs
 *
 * Usage:
 * - Run: npm run seed:legal-pages
 *   or: npx ts-node src/scripts/seedLegalPagesAndFAQs.ts
 */

const seedLegalPages = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Get or create an admin user for createdBy/updatedBy fields
    let adminUser = await User.findOne({ role: UserRole.ADMIN });
    if (!adminUser) {
      adminUser = await User.findOne({ role: UserRole.SUPER_ADMIN });
    }
    const adminUserId = adminUser?._id;

    // Legal Pages Data
    const legalPagesData = [
      {
        slug: 'terms-and-conditions',
        title: 'Terms and Conditions',
        subtitle: 'Please read these terms carefully before using our service',
        isActive: true,
        sections: [
          {
            heading: '1. Acceptance of Terms',
            body: [
              'By accessing and using Royal Competitions website and services, you accept and agree to be bound by the terms and provision of this agreement.',
              'If you do not agree to abide by the above, please do not use this service.',
            ],
          },
          {
            heading: '2. Eligibility',
            body: [
              'You must be at least 18 years old and a resident of the United Kingdom to participate in our competitions.',
              'You must have a valid UK address for prize delivery.',
              'Employees of Royal Competitions and their immediate family members are not eligible to participate.',
            ],
          },
          {
            heading: '3. Competition Entry',
            body: [
              'Entry to competitions is by purchase of tickets only, unless otherwise stated.',
              'Each ticket purchase includes one entry into the competition.',
              "Free entry methods are available as per UK competition regulations. Details can be found in each competition's terms.",
            ],
            list: {
              title: 'By entering a competition, you agree to:',
              items: [
                'Provide accurate and truthful information',
                'Comply with all competition rules',
                'Accept the decision of the draw as final',
                'Allow your name and location to be published if you win',
              ],
            },
          },
          {
            heading: '4. Payment and Refunds',
            body: [
              'All payments are processed securely through Stripe.',
              'Ticket purchases are final and non-refundable, except as required by law.',
              'If a competition is cancelled before the draw date, all ticket purchases will be refunded.',
            ],
          },
          {
            heading: '5. Draw Process',
            body: [
              'Draws are conducted using a transparent and verifiable random selection process.',
              'The draw date and time are clearly stated for each competition.',
              'Winners are selected from all valid entries received before the draw closes.',
              'The draw process is recorded and may be made available for verification.',
            ],
          },
          {
            heading: '6. Prizes',
            body: [
              'Prize details are clearly stated in each competition listing.',
              'Prizes are as described and cannot be exchanged for cash unless a cash alternative is explicitly stated.',
              'Winners are responsible for any taxes or duties payable on prizes.',
              'Prizes will be delivered within 28 days of winner confirmation, subject to availability.',
            ],
          },
          {
            heading: '7. Winner Notification',
            body: [
              'Winners will be notified by email within 7 days of the draw.',
              'Winners must respond within 14 days to claim their prize.',
              'If a winner does not respond within the specified time, an alternative winner may be selected.',
            ],
          },
          {
            heading: '8. Limitation of Liability',
            body: [
              'Royal Competitions shall not be liable for any indirect, incidental, special, or consequential damages arising from participation in competitions.',
              'Our liability is limited to the value of the ticket purchased.',
            ],
          },
          {
            heading: '9. Intellectual Property',
            body: [
              'All content on this website, including text, graphics, logos, and images, is the property of Royal Competitions.',
              'You may not reproduce, distribute, or create derivative works without our written permission.',
            ],
          },
          {
            heading: '10. Changes to Terms',
            body: [
              'We reserve the right to modify these terms at any time.',
              'Changes will be effective immediately upon posting to the website.',
              'Your continued use of the service constitutes acceptance of any changes.',
            ],
          },
          {
            heading: '11. Contact Information',
            body: [
              'If you have any questions about these Terms and Conditions, please contact us at:',
              'Email: support@royalcompetitions.co.uk',
              'Address: Royal Competitions, United Kingdom',
            ],
          },
        ],
      },
      {
        slug: 'terms-of-use',
        title: 'Terms of Use',
        subtitle: 'Rules and guidelines for using our website and services',
        isActive: true,
        sections: [
          {
            heading: '1. Website Access',
            body: [
              'You are granted a limited, non-exclusive, non-transferable license to access and use this website for personal, non-commercial purposes.',
              "You may not use this website in any way that could damage, disable, or impair the website or interfere with any other party's use of the website.",
            ],
          },
          {
            heading: '2. User Accounts',
            body: [
              'You are responsible for maintaining the confidentiality of your account credentials.',
              'You agree to notify us immediately of any unauthorized use of your account.',
              'You are responsible for all activities that occur under your account.',
            ],
          },
          {
            heading: '3. Prohibited Activities',
            body: [
              'You agree not to use the website for any unlawful purpose or in any way that violates these Terms of Use.',
            ],
            list: {
              title: 'Prohibited activities include, but are not limited to:',
              items: [
                'Attempting to gain unauthorized access to the website or its systems',
                'Transmitting viruses, malware, or any other harmful code',
                'Collecting user information without consent',
                'Impersonating any person or entity',
                'Engaging in any form of automated data collection (scraping, crawling, etc.)',
                "Interfering with or disrupting the website's operation",
              ],
            },
          },
          {
            heading: '4. Content and Materials',
            body: [
              'All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Royal Competitions or its content suppliers.',
              'You may not modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, or sell any information or services obtained from this website.',
            ],
          },
          {
            heading: '5. User-Generated Content',
            body: [
              'If you submit any content to our website (such as reviews, comments, or testimonials), you grant us a non-exclusive, royalty-free, perpetual license to use, modify, and display such content.',
              'You represent that you have the right to grant such license and that your content does not violate any third-party rights.',
            ],
          },
          {
            heading: '6. Privacy',
            body: [
              'Your use of this website is also governed by our Privacy Policy.',
              'Please review our Privacy Policy to understand how we collect, use, and protect your personal information.',
            ],
          },
          {
            heading: '7. Third-Party Links',
            body: [
              'Our website may contain links to third-party websites.',
              'We are not responsible for the content or practices of these external sites.',
              'Your use of third-party websites is at your own risk.',
            ],
          },
          {
            heading: '8. Disclaimer of Warranties',
            body: [
              'This website is provided "as is" without warranties of any kind, either express or implied.',
              'We do not warrant that the website will be uninterrupted, secure, or error-free.',
            ],
          },
          {
            heading: '9. Termination',
            body: [
              'We reserve the right to terminate or suspend your access to the website at any time, without notice, for any reason, including violation of these Terms of Use.',
            ],
          },
          {
            heading: '10. Governing Law',
            body: [
              'These Terms of Use are governed by the laws of England and Wales.',
              'Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
            ],
          },
        ],
      },
      {
        slug: 'acceptable-use',
        title: 'Acceptable Use Policy',
        subtitle: 'Guidelines for acceptable behavior when using our services',
        isActive: true,
        sections: [
          {
            heading: '1. Introduction',
            body: [
              'This Acceptable Use Policy sets out the terms between you and Royal Competitions under which you may access and use our website and services.',
              'By using our services, you agree to comply with this policy.',
            ],
          },
          {
            heading: '2. Acceptable Use',
            body: [
              'You may use our website and services only for lawful purposes and in accordance with this Acceptable Use Policy.',
            ],
            list: {
              title: 'You agree to:',
              items: [
                'Use the website in compliance with all applicable laws and regulations',
                'Provide accurate and truthful information when creating an account or entering competitions',
                'Respect the rights and privacy of other users',
                'Report any security vulnerabilities or suspicious activity',
              ],
            },
          },
          {
            heading: '3. Prohibited Uses',
            body: ['You may not use our website or services in any way that:'],
            list: {
              items: [
                'Violates any applicable local, national, or international law or regulation',
                'Infringes upon the rights of others, including intellectual property rights',
                'Is fraudulent, false, misleading, or deceptive',
                'Involves the transmission of unsolicited or unauthorized advertising or promotional material',
                'Contains viruses, malware, or other harmful computer code',
                'Attempts to gain unauthorized access to our systems or networks',
                'Interferes with or disrupts the operation of the website or services',
                'Harasses, abuses, or harms other users',
                'Collects or stores personal data about other users without their consent',
              ],
            },
          },
          {
            heading: '4. Account Security',
            body: [
              'You are responsible for maintaining the security of your account.',
              'You must not share your account credentials with anyone.',
              'You must notify us immediately if you suspect any unauthorized access to your account.',
            ],
          },
          {
            heading: '5. Competition Integrity',
            body: [
              'You must not attempt to manipulate or interfere with the competition process.',
            ],
            list: {
              title: 'Prohibited activities include:',
              items: [
                'Creating multiple accounts to gain an unfair advantage',
                'Using automated systems or bots to enter competitions',
                'Attempting to hack or manipulate the draw process',
                'Colluding with other users to influence competition outcomes',
                'Providing false information to gain entry or claim prizes',
              ],
            },
          },
          {
            heading: '6. Content Standards',
            body: ['Any content you submit to our website must:'],
            list: {
              items: [
                'Be accurate and truthful',
                'Comply with all applicable laws',
                'Not infringe on any third-party rights',
                'Not contain offensive, defamatory, or discriminatory material',
                'Not contain spam or unsolicited promotional content',
              ],
            },
          },
          {
            heading: '7. Enforcement',
            body: [
              'We reserve the right to investigate any violation of this Acceptable Use Policy.',
              'Violations may result in immediate termination of your account and access to our services.',
              'We may also take legal action against serious violations.',
            ],
          },
          {
            heading: '8. Reporting Violations',
            body: [
              'If you become aware of any violation of this policy, please report it to us immediately at support@royalcompetitions.co.uk.',
              'We take all reports seriously and will investigate them promptly.',
            ],
          },
          {
            heading: '9. Changes to This Policy',
            body: [
              'We may update this Acceptable Use Policy from time to time.',
              'Changes will be posted on this page with an updated revision date.',
              'Your continued use of our services after changes are posted constitutes acceptance of the updated policy.',
            ],
          },
        ],
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        subtitle: 'How we collect, use, and protect your personal information',
        isActive: true,
        sections: [
          {
            heading: '1. Introduction',
            body: [
              'Royal Competitions ("we", "us", "our") is committed to protecting your privacy.',
              'This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.',
              'Please read this policy carefully to understand our practices regarding your personal data.',
            ],
          },
          {
            heading: '2. Information We Collect',
            body: [
              'We collect information that you provide directly to us and information that is automatically collected when you use our services.',
            ],
            list: {
              title: 'Information you provide:',
              items: [
                'Name, email address, and contact information',
                'Billing and shipping addresses',
                'Payment information (processed securely through Stripe)',
                'Account credentials',
                'Competition entries and answers',
                'Communications with our support team',
              ],
            },
          },
          {
            heading: '3. How We Use Your Information',
            body: ['We use the information we collect to:'],
            list: {
              items: [
                'Process and manage your competition entries',
                'Process payments and deliver prizes',
                'Communicate with you about your account and competitions',
                "Send you important updates about competitions you've entered",
                'Improve our website and services',
                'Comply with legal obligations',
                'Send marketing communications (with your consent)',
                'Detect and prevent fraud or abuse',
              ],
            },
          },
          {
            heading: '4. Legal Basis for Processing',
            body: ['We process your personal data based on:'],
            list: {
              items: [
                'Contract: To fulfill our obligations when you enter competitions',
                'Legal obligation: To comply with UK competition and gambling regulations',
                'Legitimate interests: To improve our services and prevent fraud',
                'Consent: For marketing communications (you can withdraw at any time)',
              ],
            },
          },
          {
            heading: '5. Information Sharing and Disclosure',
            body: [
              'We do not sell your personal information.',
              'We may share your information with:',
            ],
            list: {
              items: [
                'Service providers who assist us in operating our website and processing payments (e.g., Stripe, hosting providers)',
                'Prize suppliers and delivery companies (only for prize fulfillment)',
                'Legal authorities when required by law or to protect our rights',
                'Other parties with your explicit consent',
              ],
            },
          },
          {
            heading: '6. Data Security',
            body: [
              'We implement appropriate technical and organizational measures to protect your personal data.',
              'This includes encryption, secure servers, and access controls.',
              'However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.',
            ],
          },
          {
            heading: '7. Your Rights',
            body: ['Under UK GDPR, you have the following rights:'],
            list: {
              items: [
                'Right to access: Request a copy of your personal data',
                'Right to rectification: Correct inaccurate or incomplete data',
                'Right to erasure: Request deletion of your data (subject to legal obligations)',
                'Right to restrict processing: Limit how we use your data',
                'Right to data portability: Receive your data in a structured format',
                'Right to object: Object to certain types of processing',
                'Right to withdraw consent: Withdraw consent for marketing communications',
              ],
            },
          },
          {
            heading: '8. Cookies and Tracking Technologies',
            body: [
              'We use cookies and similar tracking technologies to enhance your experience on our website.',
              'Cookies help us remember your preferences, analyze website traffic, and improve our services.',
              'You can control cookies through your browser settings, but this may affect website functionality.',
            ],
          },
          {
            heading: '9. Data Retention',
            body: [
              'We retain your personal data for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.',
              'Account information is retained while your account is active and for a reasonable period after closure.',
              'Competition entry data is retained as required by UK competition regulations.',
            ],
          },
          {
            heading: "10. Children's Privacy",
            body: [
              'Our services are not intended for individuals under 18 years of age.',
              'We do not knowingly collect personal information from children.',
              'If we become aware that we have collected information from a child, we will delete it immediately.',
            ],
          },
          {
            heading: '11. International Data Transfers',
            body: [
              'Your information may be transferred to and processed in countries outside the UK/EEA.',
              'We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.',
            ],
          },
          {
            heading: '12. Changes to This Privacy Policy',
            body: [
              'We may update this Privacy Policy from time to time.',
              'We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date.',
              'We encourage you to review this policy periodically.',
            ],
          },
          {
            heading: '13. Contact Us',
            body: [
              'If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:',
              'Email: privacy@royalcompetitions.co.uk',
              'Address: Royal Competitions, United Kingdom',
            ],
          },
        ],
      },
    ];

    // Seed Legal Pages
    console.log('🌱 Seeding Legal Pages...');
    for (const pageData of legalPagesData) {
      const existingPage = await LegalPage.findOne({ slug: pageData.slug });

      const pagePayload: any = {
        slug: pageData.slug,
        title: pageData.title,
        subtitle: pageData.subtitle,
        sections: pageData.sections,
        isActive: pageData.isActive,
      };

      // Only add ObjectIds if they exist
      if (adminUserId) {
        pagePayload.createdBy = adminUserId;
        pagePayload.updatedBy = adminUserId;
      }

      if (existingPage) {
        // Update existing page
        existingPage.title = pageData.title;
        existingPage.subtitle = pageData.subtitle;
        existingPage.sections = pageData.sections as any;
        existingPage.isActive = pageData.isActive;
        if (adminUserId) {
          existingPage.updatedBy = adminUserId as any;
        }
        await existingPage.save();
        console.log(`   ✅ Updated: ${pageData.title}`);
      } else {
        // Create new page
        await LegalPage.create(pagePayload);
        console.log(`   ✅ Created: ${pageData.title}`);
      }
    }

    // FAQs Data
    const faqsData = [
      {
        id: 'faq-001',
        question: 'How do competitions work?',
        answer:
          'Competitions are skill-based contests where participants purchase tickets and answer a skill-based question. Once all tickets are sold or the draw date arrives, a winner is selected through a transparent and verifiable random draw process. Winners are notified by email and must respond within 14 days to claim their prize.',
        category: 'Competitions',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-002',
        question: 'How are winners selected?',
        answer:
          'Winners are selected using a transparent random selection process. The draw is conducted using a verifiable algorithm with a cryptographic seed, ensuring fairness and transparency. The draw process is recorded and may be made available for verification. All valid entries have an equal chance of winning.',
        category: 'Draws',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-003',
        question: "Can I get a refund if I don't win?",
        answer:
          'No, ticket purchases are final and non-refundable. This is standard practice for competition entries. However, if a competition is cancelled before the draw date, all ticket purchases will be refunded in full.',
        category: 'Payments',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-004',
        question: 'How do I claim my prize if I win?',
        answer:
          'If you win, you will receive an email notification within 7 days of the draw. You must respond within 14 days to claim your prize. Once confirmed, we will arrange for prize delivery within 28 days. You may be required to provide proof of identity and complete any necessary paperwork.',
        category: 'Prizes',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-005',
        question: 'Are there any age restrictions?',
        answer:
          'Yes, you must be at least 18 years old to enter our competitions. You must also be a resident of the United Kingdom with a valid UK address for prize delivery. We may request proof of age and residency.',
        category: 'General',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-006',
        question: 'How do I enter a competition?',
        answer:
          "To enter a competition, simply browse our available competitions, select the one you're interested in, choose the number of tickets you want to purchase, and complete the checkout process. You'll need to answer a skill-based question as part of your entry. Each ticket gives you one entry into the competition.",
        category: 'Competitions',
        order: 2,
        isActive: true,
      },
      {
        id: 'faq-007',
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major credit and debit cards through our secure payment processor, Stripe. All payments are processed securely and we never store your full card details on our servers.',
        category: 'Payments',
        order: 2,
        isActive: true,
      },
      {
        id: 'faq-008',
        question: 'Can I enter competitions for free?',
        answer:
          "Yes, we offer a free entry method in compliance with UK competition regulations. Details for free entry are available in each competition's terms and conditions. Free entries must be submitted by post and include the required information.",
        category: 'Competitions',
        order: 3,
        isActive: true,
      },
      {
        id: 'faq-009',
        question: 'When will the draw take place?',
        answer:
          'The draw date and time are clearly stated on each competition page. Draws typically take place once all tickets are sold or on the specified draw date, whichever comes first. The exact time will be displayed in UK time (GMT/BST).',
        category: 'Draws',
        order: 2,
        isActive: true,
      },
      {
        id: 'faq-010',
        question: 'Will my personal information be shared?',
        answer:
          'We take your privacy seriously. We will never sell your personal information. We only share information with service providers necessary to operate our business (like payment processors) and prize suppliers for prize delivery. Your information may also be shared if required by law. Please see our Privacy Policy for full details.',
        category: 'Account',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-011',
        question:
          "What happens if I can't answer the skill question correctly?",
        answer:
          'You must answer the skill-based question correctly to have a valid entry. If you answer incorrectly, your entry will not be included in the draw. However, you can review the question and try again with a new ticket purchase if you wish.',
        category: 'Competitions',
        order: 4,
        isActive: true,
      },
      {
        id: 'faq-012',
        question: 'Can I change or cancel my entry?',
        answer:
          'Once an entry is submitted and payment is processed, it cannot be changed or cancelled. This is because the competition draw process begins immediately. However, if a competition is cancelled by us before the draw, all entries will be refunded.',
        category: 'Competitions',
        order: 5,
        isActive: true,
      },
      {
        id: 'faq-013',
        question: "How will I know if I've won?",
        answer:
          'Winners are notified by email within 7 days of the draw. The email will be sent to the address associated with your account. We may also publish winner information on our website and social media channels (with your consent). Make sure your email address is up to date in your account settings.',
        category: 'Prizes',
        order: 2,
        isActive: true,
      },
      {
        id: 'faq-014',
        question: 'Are prizes new or used?',
        answer:
          'All prizes are brand new unless otherwise stated. Prize conditions (new, refurbished, etc.) are clearly described in each competition listing. Prizes come with manufacturer warranties where applicable.',
        category: 'Prizes',
        order: 3,
        isActive: true,
      },
      {
        id: 'faq-015',
        question: 'Do I have to pay tax on my prize?',
        answer:
          'In the UK, competition winnings are generally not subject to income tax. However, you may be responsible for any taxes or duties payable on prizes, depending on the prize value and type. We recommend consulting with a tax advisor for specific advice. Cash alternatives may have different tax implications.',
        category: 'Prizes',
        order: 4,
        isActive: true,
      },
      {
        id: 'faq-016',
        question: 'How do I create an account?',
        answer:
          'Creating an account is easy! Click the "Sign Up" or "Register" button, enter your name, email address, and create a password. You\'ll receive a verification email - click the link to verify your account. Once verified, you can start entering competitions.',
        category: 'Account',
        order: 2,
        isActive: true,
      },
      {
        id: 'faq-017',
        question: 'I forgot my password. How do I reset it?',
        answer:
          'Click the "Forgot Password" link on the login page, enter your email address, and we\'ll send you a password reset link. Click the link in the email to create a new password. The link will expire after a certain time for security reasons.',
        category: 'Account',
        order: 3,
        isActive: true,
      },
      {
        id: 'faq-018',
        question: 'Can I enter the same competition multiple times?',
        answer:
          'Yes, you can purchase multiple tickets for the same competition. Each ticket gives you an additional entry and increases your chances of winning. There is no limit to the number of tickets you can purchase, subject to availability.',
        category: 'Competitions',
        order: 6,
        isActive: true,
      },
      {
        id: 'faq-019',
        question: 'What if the website is down during a competition?',
        answer:
          'If our website experiences technical issues, we will extend the competition deadline accordingly. We recommend following our social media channels for updates. If you experience issues, please contact our support team immediately.',
        category: 'Technical',
        order: 1,
        isActive: true,
      },
      {
        id: 'faq-020',
        question: 'How do I contact customer support?',
        answer:
          'You can contact our customer support team by email at support@royalcompetitions.co.uk. We aim to respond to all inquiries within 24-48 hours during business days. For urgent matters related to active competitions, please mention this in your email subject line.',
        category: 'General',
        order: 2,
        isActive: true,
      },
    ];

    // Seed FAQs
    console.log('\n🌱 Seeding FAQs...');
    for (const faqData of faqsData) {
      const existingFAQ = await FAQ.findOne({ id: faqData.id });

      if (existingFAQ) {
        // Update existing FAQ
        existingFAQ.question = faqData.question;
        existingFAQ.answer = faqData.answer;
        existingFAQ.category = faqData.category;
        existingFAQ.order = faqData.order;
        existingFAQ.isActive = faqData.isActive;
        if (adminUserId) {
          existingFAQ.updatedBy = adminUserId as any;
        }
        await existingFAQ.save();
        console.log(
          `   ✅ Updated: ${faqData.id} - ${faqData.question.substring(0, 50)}...`
        );
      } else {
        // Create new FAQ
        await FAQ.create({
          ...faqData,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        });
        console.log(
          `   ✅ Created: ${faqData.id} - ${faqData.question.substring(0, 50)}...`
        );
      }
    }

    console.log('\n✅ Legal Pages and FAQs seeded successfully!');
    logger.info('Legal Pages and FAQs seeded successfully');

    // Disconnect from database
    await disconnectDatabase();
    process.exit(0);
  } catch (error: any) {
    logger.error('Error seeding legal pages and FAQs:', error);
    console.error('❌ Error seeding legal pages and FAQs:', error.message);
    console.error(error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedLegalPages();
}

export default seedLegalPages;
