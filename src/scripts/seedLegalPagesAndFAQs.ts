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

    // Helper to convert structured sections into simple rich text (HTML)
    const buildHtmlFromSections = (sections: any[]): string => {
      return sections
        .map((section) => {
          const parts: string[] = [];
          if (section.heading) {
            parts.push(`<h2>${section.heading}</h2>`);
          }
          if (section.body && Array.isArray(section.body)) {
            section.body.forEach((p: string) => {
              parts.push(`<p>${p}</p>`);
            });
          }
          if (
            section.list &&
            section.list.items &&
            section.list.items.length > 0
          ) {
            if (section.list.title) {
              parts.push(`<h3>${section.list.title}</h3>`);
            }
            const itemsHtml = section.list.items
              .map((item: string) => `<li>${item}</li>`)
              .join('');
            parts.push(`<ul>${itemsHtml}</ul>`);
          }
          return parts.join('\n');
        })
        .join('\n\n');
    };

    // Legal Pages Data (structured, converted to rich text content before saving)
    const legalPagesData = [
      {
        slug: 'terms-and-conditions',
        title: 'Terms and Conditions',
        subtitle:
          'Please read these terms carefully before entering our competitions',
        isActive: true,
        sections: [
          {
            heading: '1. The Promoter',
            body: [
              'The Promoter is: Ace Comps Group Ltd Company Number SC686957 and whose registered office is at 6 Brockwood Place, Aberdeen, AB21 0JU, United Kingdom.',
              'Our correspondence address is 6 Brockwood Place, Aberdeen, AB21 0JU, United Kingdom.',
              'If you wish to contact us for any reason, please email info@acecompetitions.co.uk.',
            ],
          },
          {
            heading: '2. The competition',
            body: [
              '2.1. These terms and conditions apply to all competitions listed on the Promoter’s website at https://www.royalcompetitions.co.uk (the \"Website\").',
              '2.2. All competitions are skill-based competitions. Entry fees for online entries are payable each time you enter. Where the Promoter offers an easy or multiple choice question, a free entry route is available.',
              '2.3. To be in with a chance of winning, everyone who enters the competition (an \"Entrant\") will be required to correctly answer a question or solve a problem set by the Promoter (the \"Competition Question\").',
            ],
          },
          {
            heading: '3. How to enter',
            body: [
              '3.1. The competition will run from and including the opening and closing dates specified on the Website. These dates shall be referred to as the \"Opening Date\" and \"Closing Date\" respectively. All times and dates referred to are the times and dates in London, England.',
              '3.2. If it is absolutely necessary to do so, the Promoter reserves the right to change the Opening and Closing Dates. If the Promoter does change the Opening Date and/or the Closing Date of a competition, the new details will be displayed on the Website. The Promoter will not extend the Closing Date simply to sell more entries.',
              '3.3. All competition entries must be received by the Promoter by no later than the specified time on the Closing Date. All competition entries received after the specified time on the Closing Date may be disqualified without a refund.',
              '3.4. The maximum number of entries to the competition will be stated on the Website. The number of entries you are able to make may be limited if the maximum number of entries is reached.',
              '3.5. Entrants can enter each competition as many times as they wish until the maximum number of entries per user have been submitted and until the maximum number of entries for the competition have been received. Entrants submitting free entries must submit each entry separately. Bulk entries, if received, will not be accepted and will only be counted as one single entry. Entries may be limited if the maximum number of entries for the competition is reached.',
              '3.6. To enter the competition online: (a) go to the Website and view the Competition Question; (b) select your answer to the competition question and required number of entries; then (c) complete the checkout process and submit the online registration form; then (d) complete the payment to receive your order confirmation; (e) you may repeat this process as many times as you wish up to the maximum number of tickets allowed per Entrant, or until the total quantity of tickets have been allocated.',
              '3.7. All entries must be submitted in the English language. Entries in languages other than English will automatically be disqualified and no refund will be given.',
              '3.8. Unless you are using the free entry method, the Promoter will send confirmation that your entry has been received, and your allocated ticket number(s).',
              '3.9. The Promoter will not accept responsibility for competition entries that are not successfully completed, are lost or are delayed regardless of cause, including, for example, as a result of any equipment failure, technical malfunction, systems, satellite, network, server, computer hardware or software failure of any kind.',
              '3.10. By purchasing entries and submitting a competition entry, you are entering into a contract with the Promoter and are agreeing to be bound by these terms and conditions.',
              '3.11. You may enter the competition for free by post by complying with the following conditions: (a) send your entry on an unenclosed postcard by first or second class post to the Promoter at the following address: 6 Brockwood Place, Aberdeen, AB21 0JU, United Kingdom; (b) hand delivered entries will not be accepted and will not be entered into the random draw; (c) include with your entry the following information: (i) your full name; (ii) your address; (iii) a contact telephone number and email address; and (iv) the Competition you are entering and your answer to the Competition Question; (d) incomplete or illegible entries will be disqualified; (e) you may make multiple free entries for any competition (up to any limit placed on entries by the Promoter) but each free entry must be submitted and posted to the Promoter separately. Bulk entries in one envelope will not be accepted as multiple entries and if a bulk entry is received, it will be counted as one single entry; (f) by entering the competition, you are confirming that you are eligible to enter and accept these terms and conditions; (g) your entry must be received by the Promoter prior to the Closing Date. Entries received after the Closing Date will not be entered into the random draw. Proof of posting does not guarantee you will be entered into the random draw; (h) the Promoter will not acknowledge receipt of your entry nor confirm if your answer to the Competition Question is correct; (i) if the number of entries reaches any cap or limit before your free entry is received, you will not be entered into the random draw; (j) Entrants must have created an account on the Website for the free entry to be processed. All details MUST correspond to the details on the account. Postal entries received without a registered account cannot be processed.',
            ],
          },
          {
            heading: '4. Choosing a winner',
            body: [
              '4.1. All Entrants who correctly answer the Competition Question will be placed into a draw and the winner will be chosen by random draw. The random draw will take place as soon as reasonably possible and, in any event, within 7 days of the Closing Date (“Draw Date”).',
              '4.2. All Entrants will have their names and entry numbers included in a spreadsheet which may be published on the Website and may be visible during the live draw. If you do not wish to have your name included in this spreadsheet you must contact the Promoter via email at info@acecompetitions.co.uk as soon as possible after you have completed your entry and in any event, at least 48 hours before the live draw takes place.',
              'For help with entries, please email us at info@acecompetitions.co.uk.',
            ],
          },
          {
            heading: '5. Eligibility',
            body: [
              '5.1. The competition is only open to all residents in the United Kingdom aged 18 years or over, except: (a) employees of the Promoter; (b) employees of agents or suppliers of the Promoter, who are professionally connected with the competition or its administration.',
              '5.2. By entering the competition, you confirm that you are eligible to do so and eligible to claim any prize you may win. The Promoter may require you to provide proof that you are eligible to enter the competition and claim the prize. If you fail to provide the Promoter with any such proof or other information that they may require within a reasonable time, you may be disqualified from the competition.',
              '5.3. The Promoter will not accept competition entries that are: (a) automatically generated by computer; or (b) incomplete.',
              '5.4. The Promoter reserves all rights to disqualify you if your conduct is contrary to the spirit or intention of the prize competition. This includes if you are rude or abusive to the Promoter or anyone associated with them.',
              '5.5. Subject to clause 11.3 below, no refunds of the entry fee will be given in any event, including: (a) if, following your entry into the competition, you subsequently find out that you are not eligible to enter the competition or claim the Prize; (b) if, following your entry into the competition the eligibility criteria for entering the competition or claiming the Prize changes and you are no longer eligible; or (c) if you are disqualified from the competition by the Promoter for any reason.',
              '5.6. If the Entrant engages in: (a) any form of fraud (actual or apparent); (b) fraudulent misrepresentation; (c) fraudulent concealment; (d) hacking or interference with the proper functioning of the website; or (e) amending, or unauthorised use of, any of the code that constitutes the website, all of their entries will be declared void, no refunds will be given and they may be prevented from participating in any future competitions.',
            ],
          },
          {
            heading: '6. The prize',
            body: [
              '6.1. The prize for each competition is described on the Website (the “Prize”). Details of the Prize are, to the best of the Promoter’s knowledge, information and belief, correct as at the Opening Date.',
              '6.2. Prizes are subject to availability. The Promoter reserves the right to substitute any prize with a prize of equal or greater value. If any details of the Prize change, the Promoter will endeavour to update the Website as soon as reasonably possible.',
              '6.3. The Promoter makes no representations and gives no warranties about the Prize, its value, its condition or any other information provided on the Website. The Promoter makes no representations and gives no warranties that the information provided on the Website is accurate, complete or up to date. If the Prize is a vehicle: (a) the Promoter will, unless otherwise stated, ensure it comes with a valid MOT (if required); (b) no insurance is included with the Prize and it is the Winner’s responsibility to ensure the vehicle is adequately insured prior to taking it on the public roads (if it is legal to do so); (c) the Promoter has no responsibility for the Prize(s) once it has been delivered. The Winner is solely responsible for complying with all relevant laws and regulations relating to the vehicle, its operation and ensuring they operate it in a safe and responsible manner; (d) no vehicle/road tax is included; (e) the Winner is responsible for ensuring they have the necessary licences, qualification, knowledge and experience to operate the vehicle safely and legally; (f) the Winner is solely responsible for ensuring they have all necessary safety equipment and clothing (for example, helmets, boots and gloves) and for wearing them whilst operating the vehicle.',
              '6.4. The Prize may be supplied by a third-party supplier (the “Supplier”). Details of the Supplier (if any) will be provided on the Website.',
              '6.5. The Promoter reserves the right to substitute the Prize for an alternative cash prize (“Cash Prize”) in the following circumstances: (a) the Prize becomes unavailable; (b) other circumstances beyond the reasonable control of the Promoter make it necessary to do so.',
              '6.6. The prize is not negotiable or transferable.',
              '6.7. Where the prize is a holiday, event or day trip: (a) The number of people, class of transport and type of carrier, travel destination, nights and available dates will be listed in the competition description. The prize does not include travel insurance, the cost of transfers to and from airports or stations, food and drink, spending money, tax or personal expenses. Any other costs incurred in addition to those set out above and that are incidental to the fulfilment of the prize are the responsibility of the winner(s). (b) You will be responsible for ensuring that you and any person travelling with you are available to travel and hold valid passports, any necessary visas and travel documents for the holiday in question on the travel dates specified.',
            ],
          },
          {
            heading: '7. Winners',
            body: [
              '7.1. The decision of the Promoter is final and no correspondence or discussion will be entered into.',
              '7.2. The Winner’s full name will be announced during the live draw. If you wish for your name to be censored during the live draw please contact info@acecompetitions.co.uk with reasonable time left before the prize draw takes place.',
              '7.3. The Promoter will contact the winner personally as soon as practicable after the Draw Date using the telephone number or email address provided with the competition entry. If the winner cannot be contacted, is not available, or has not claimed the Prize, within 21 days of the Draw Date the Promoter reserves the right to offer the Prize to another Entrant (“The Alternate Winner“) selected at random in the same method as before from the remaining correct entries received before the Closing Date. The Alternate Winner shall have 21 days from notification of their status by the Promoters to communicate their acceptance of the Prize. This process shall continue until a winner accepts the Prize.',
              '7.4. The Promoter must either publish or make available information that indicates that a valid award took place. To comply with this obligation the Promoter will publish the full name and county/town of residence of major prize winners on the Website.',
              '7.5. If you object to any or all of your surname, county/town of residence and winning entry being published or made available, please contact the Promoter at info@acecompetitions.co.uk prior to the Closing Date. In such circumstances, the Promoter must still provide the information to the Advertising Standards Authority on request.',
            ],
          },
          {
            heading: '8. Claiming the prize',
            body: [
              '8.1. You must claim the Prize personally. The Prize may not be claimed by a third party on your behalf. Details of how the Prize will be delivered to you (or made available for collection) are published on the Website, or available on request.',
              '8.2. If your personal details, including contact information, changes at any time you should notify the Promoter as soon as reasonably possible. Notifications should be sent to the Promoter via email to info@acecompetitions.co.uk. Notifications must include details of the competition you have entered, your old details and your new details. If your details change within 10 days of the Closing Date, the Promoter will use your old details if it needs to try to contact you.',
              '8.3. Any Cash Prize will be transferred directly to the winners nominated bank account. The winner must provide evidence that it is the sole or joint beneficiary of the bank account. Failure to do so within 14 days will result in disqualification from the competition and the winner forfeiting the prize. In such circumstances, the Promoter reserves the right to offer the prize to the next eligible Entrant selected from the correct entries that were received before the Closing Date.',
              '8.4. The Promoter does not accept any responsibility and is not liable to pay any compensation if you are unable to or do not take up the prize.',
              '8.5. If the Prize is a vehicle and the winner has completed all eligibility checks, the prize will be transferred to the winner by the Promoter using the V5 for each vehicle. This must be completed before the vehicle is handed over.',
            ],
          },
          {
            heading: '9. Limitation of liability',
            body: [
              'Insofar as is permitted by law, the Promoter, its agents or distributors will not in any circumstances be responsible or liable to compensate the winner or accept any liability for any loss, damage, personal injury or death occurring as a result of taking up the prize except where it is caused by the negligence of the Promoter, its agents or distributors or that of their employees. Your statutory rights are not affected.',
            ],
          },
          {
            heading: '10. Data protection and publicity',
            body: [
              '10.1. By entering the competition, you agree that any personal information provided by you with the competition entry may be held and used only by the Promoter or its agents and suppliers to administer the competition or as otherwise set out in the Promoter’s Privacy Policy, a copy of which is available on the Website.',
              '10.2. If you are the winner of the competition, you agree that the Promoter may use your name, image and town or county of residence to announce the winner of this competition. You further agree to participate in any reasonable publicity required by the Promoter.',
              '10.3. If you do not wish to participate in any publicity, you must notify the Promoter prior to the Closing Date. This will not affect your chances of winning the Prize. If you do not agree to participate in any publicity about the competition we may still provide your details to the Advertising Standards Authority. This is a legal requirement that we must comply with to prove that the competition has been properly administered and the Prize awarded.',
              '10.4. If you are the winner of the competition, you may be required to provide further personal information and proof of your identity in order to confirm your eligibility to claim the Prize and transfer ownership of the Prize to you. You consent to the use of your information in this way. You are entitled to request further details about how your personal information is being used. You may also withdraw your consent to your personal information being used in such way but by doing so you may prevent the Prize being transferred to you. In such circumstances, you will be deemed to have withdrawn from the competition and forfeit the Prize. You will not be entitled to any refund of your entry fee. The Promoter reserves the right to offer the Prize to the next eligible Entrant selected from the correct entries that were received before the Closing Date.',
              '10.5. Please note that under data protection laws you are entitled to request that the Promoter does not contact you and removes your details from its database. If you make such a request you will be withdrawing from the competition as it will not be possible to contact you in the event that you are the winner. You will not be entitled to any refund of any entry fee if you withdraw from the competition. If you do not wish any of your personal details to be used by the Promoter for promotional purposes, please email the Promoter at info@acecompetitions.co.uk prior to the Closing Date.',
            ],
          },
          {
            heading: '11. General',
            body: [
              '11.1. The Promoter reserves the right to amend these terms and conditions from time to time. The latest version of these terms and conditions will be available on the Website.',
              '11.2. If there is any reason to believe that there has been a breach of these terms and conditions, the Promoter may, at its sole discretion, reserve the right to exclude you from participating in the competition and any future competitions.',
              '11.3. The Promoter reserves the right to hold void, suspend, cancel, or amend the prize competition where it becomes necessary to do so for circumstances out of its control. In such circumstances, the Promoter will refund any entry fees you have paid.',
              '11.4. There is no minimum number of entries and the Promoter will not hold void, suspend, cancel, extend the Closing Date or amend the prize competition due to a lack of entries. The draw will take place and the Prize will be awarded regardless of the number of entries received.',
              '11.5. The competitions on the Website are in no way sponsored, endorsed, administered by or associated with Facebook. By entering the competitions, Entrants agree that Facebook has no liability and is not responsible for the administration or promotion of the competitions.',
              '11.6. These terms and conditions shall be governed by Scottish law, and the parties submit to the exclusive jurisdiction of the courts of Scotland.',
              '11.7. We require winners photos for all wins with a value of £500 or over. This is compulsory. Refusal to provide a winners photo can be damaging to our business. We require these for transparency. You may ask a family member to take the photo on your behalf, however the photo must be bright and clear with our “ace winner” image on full display. We will not accept photos of pets or babies as an alternative.',
              '11.8. You should print a copy of these terms and conditions and keep them for your records.',
            ],
          },
        ],
      },
      {
        slug: 'terms-of-use',
        title: 'Terms of Use',
        subtitle: 'Website terms of use and acceptable use policy',
        isActive: true,
        sections: [
          {
            heading:
              'PLEASE READ THESE TERMS AND CONDITIONS CAREFULLY BEFORE USING THIS SITE',
            body: [
              'These terms tell you the rules for using our website https://www.royalcompetitions.co.uk (our site).',
            ],
          },
          {
            heading: 'Who we are and how to contact us',
            body: [
              'Our site is a site operated by Ace Comps Group Ltd (“We”). We are registered in Scotland under Company Number SC686957 and have our registered office at 6 Brockwood Place, Aberdeen, AB21 0JU, United Kingdom. Our main trading address is 6 Brockwood Place, Aberdeen, AB21 0JU, United Kingdom.',
              'We are a limited company.',
              'To contact us, please email info@acecompetitions.co.uk or contact us directly via our website.',
            ],
          },
          {
            heading: 'By using our site you accept these terms',
            body: [
              'By using our site, you confirm that you accept these terms of use and that you agree to comply with them.',
              'If you do not agree to these terms, you must not use our site.',
              'We recommend that you print a copy of these terms for future reference.',
            ],
          },
          {
            heading: 'There are other terms that may apply to you',
            body: [
              'These terms of use refer to the following additional terms, which also apply to your use of our site:',
              'Our Privacy Policy, which sets out the terms on which we process any personal data we collect from you, or that you provide to us. By using our site, you consent to such processing and you warrant that all data provided by you is accurate.',
              'Our Acceptable Use Policy, which sets out the permitted uses and prohibited uses of our site. When using our site, you must comply with this Acceptable Use Policy.',
              'If you purchase goods or services from our site, participate in any promotions or enter any of our competitions, other terms and conditions will apply and which you must accept and abide by.',
            ],
          },
          {
            heading: 'We may make changes to these terms',
            body: [
              'We may amend these terms from time to time. Every time you wish to use our site, please check these terms to ensure you understand the terms that apply at that time.',
            ],
          },
          {
            heading: 'We may make changes to our site',
            body: [
              'We may update and change our site from time to time to reflect changes to our products, services, our users’ needs and our business priorities.',
            ],
          },
          {
            heading: 'We may suspend or withdraw our site',
            body: [
              'Our site is made available free of charge but you may have to pay to enter our competitions.',
              'We do not guarantee that our site, or any content on it, will always be available or be uninterrupted. We may suspend or withdraw or restrict the availability of all or any part of our site for business and operational reasons. We will try to give you reasonable notice of any suspension or withdrawal.',
              'You are also responsible for ensuring that all persons who access our site through your internet connection are aware of these terms of use and other applicable terms and conditions, and that they comply with them.',
            ],
          },
          {
            heading: 'Who can use our site?',
            body: [
              'Our site is directed to people residing in the United Kingdom. We do not represent that the content available on or through our site is appropriate for use or available in other locations.',
            ],
          },
          {
            heading: 'You must keep your account details safe',
            body: [
              'If you choose, or you are provided with, a user identification code, password or any other piece of information as part of our security procedures, you must treat such information as confidential. You must not disclose it to any third party.',
              'We have the right to disable any user identification code or password, whether chosen by you or allocated by us, at any time, if in our reasonable opinion you have failed to comply with any of the provisions of these terms of use.',
              'If you know or suspect that anyone other than you knows your user identification code or password, you must promptly notify us at info@acecompetitions.co.uk.',
            ],
          },
          {
            heading: 'How you may use material on our site',
            body: [
              'We are the owner or the licensee of all intellectual property rights in our site, and in the material published on it. Those works are protected by copyright laws and treaties around the world. All such rights are reserved.',
              'You may print off one copy, and may download extracts, of any page(s) from our site for your personal use and you may draw the attention of others within your organisation to content posted on our site.',
              'You must not modify the paper or digital copies of any materials you have printed off or downloaded in any way, and you must not use any illustrations, photographs, video or audio sequences or any graphics separately from any accompanying text.',
              'Our status (and that of any identified contributors) as the authors of content on our site must always be acknowledged.',
              'You must not use any part of the content on our site for commercial purposes without obtaining a licence to do so from us or our licensors.',
              'If you print off, copy or download any part of our site in breach of these terms of use, your right to use our site will cease immediately and you must, at our option, return or destroy any copies of the materials you have made.',
            ],
          },
          {
            heading: 'Do not rely on information on this site',
            body: [
              'The content on our site is provided for general information only. It is not intended to amount to advice on which you should rely. You must obtain professional or specialist advice before taking, or refraining from, any action on the basis of the content on our site.',
              'Although we make reasonable efforts to update the information on our site, we make no representations, warranties or guarantees, whether express or implied, that the content on our site is accurate, complete or up to date.',
            ],
          },
          {
            heading: 'We are not responsible for websites we link to',
            body: [
              'Where our site contains links to other sites and resources provided by third parties, these links are provided for your information only. Such links should not be interpreted as approval by us of those linked websites or information you may obtain from them.',
              'We have no control over the contents of those sites or resources.',
            ],
          },
          {
            heading: 'User-generated content is not approved by us',
            body: [
              'This website may include information and materials uploaded by other users of the site, including posts made to our social media accounts. This information and these materials have not been verified or approved by us. The views expressed by other users on our site do not represent our views or values.',
              'If you wish to complain about information and materials uploaded by other users please contact us at info@acecompetitions.co.uk.',
            ],
          },
          {
            heading: 'Information about our use of cookies',
            body: [
              'Our website uses cookies to distinguish you from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site. By continuing to browse the site, you are agreeing to our use of cookies.',
              'A cookie is a small file of letters and numbers that we store on your browser or the hard drive of your computer if you agree. Cookies contain information that is transferred to your computer’s hard drive.',
              'We use strictly necessary cookies, analytical/performance cookies, functionality cookies and targeting cookies to operate and improve our website and tailor content and advertising to your interests.',
              'Please note that third parties (including, for example, advertising networks and providers of external services like web traffic analysis services) may also use cookies, over which we have no control. These cookies are likely to be analytical/performance cookies or targeting cookies.',
              'You can block cookies by activating the setting on your browser that allows you to refuse the setting of all or some cookies. However, if you use your browser settings to block all cookies (including essential cookies) you may not be able to access all or parts of our site.',
            ],
          },
          {
            heading: 'Our responsibility for loss or damage suffered by you',
            body: [
              'We do not exclude or limit in any way our liability to you where it would be unlawful to do so. This includes liability for death or personal injury caused by our negligence or the negligence of our employees, agents or subcontractors and for fraud or fraudulent misrepresentation.',
              'Different limitations and exclusions of liability will apply to liability arising as a result of the supply of any products or services to you or if you enter our competitions, which will be set out in our Terms and Conditions.',
              'Please note that we only provide our site for domestic and private use. You agree not to use our site for any commercial or business purposes, and we have no liability to you for any loss of profit, loss of business, business interruption, or loss of business opportunity.',
            ],
          },
          {
            heading: 'Uploading content to our site',
            body: [
              'Whenever you make use of a feature that allows you to upload content to our site, post to our social media accounts or to make contact with other users of our site, you must comply with the content standards set out in our Acceptable Use Policy.',
              'You warrant that any such contribution does comply with those standards, and you will be liable to us and indemnify us for any breach of that warranty.',
              'Any content you upload to our site will be considered non-confidential and non-proprietary. You retain all of your ownership rights in your content, but you are required to grant us a perpetual, worldwide, non-exclusive, royalty-free, transferable licence to use, reproduce, distribute, prepare derivative works of, display, and perform that user-generated content.',
              'We also have the right to disclose your identity to any third party who is claiming that any content posted or uploaded by you to our site constitutes a violation of their intellectual property rights, or of their right to privacy.',
              'We have the right to remove any posting you make on our site if, in our opinion, your post does not comply with the content standards set out in our Acceptable Use Policy.',
              'You are solely responsible for securing and backing up your content.',
            ],
          },
          {
            heading:
              'We are not responsible for viruses and you must not introduce them',
            body: [
              'We do not guarantee that our site will be secure or free from bugs or viruses.',
              'You are responsible for configuring your information technology, computer programmes and platform to access our site. You should use your own virus protection software.',
              'You must not misuse our site by knowingly introducing viruses, trojans, worms, logic bombs or other material that is malicious or technologically harmful. You must not attempt to gain unauthorised access to our site, the server on which our site is stored or any server, computer or database connected to our site.',
              'You must not attack our site via a denial-of-service attack or a distributed denial-of service attack. By breaching this provision, you would commit a criminal offence under the Computer Misuse Act 1990. We will report any such breach to the relevant law enforcement authorities and we will cooperate with those authorities by disclosing your identity to them. In the event of such a breach, your right to use our site will cease immediately.',
            ],
          },
          {
            heading: 'Rules about linking to our site',
            body: [
              'You may link to our home page, provided you do so in a way that is fair and legal and does not damage our reputation or take advantage of it.',
              'You must not establish a link in such a way as to suggest any form of association, approval or endorsement on our part where none exists.',
              'You must not establish a link to our site in any website that is not owned by you.',
              'Our site must not be framed on any other site, nor may you create a link to any part of our site other than the home page.',
              'We reserve the right to withdraw linking permission without notice.',
              'The website in which you are linking must comply in all respects with the content standards set out in our Acceptable Use Policy.',
              'If you wish to link to or make any use of content on our site other than that set out above, please contact info@acecompetitions.co.uk.',
            ],
          },
          {
            heading: 'Which country’s laws apply to any disputes?',
            body: [
              'These terms of use, their subject matter and their formation, are governed by English law. You and we both agree that the courts of England and Wales will have exclusive jurisdiction to deal with any disputes between us.',
              'Wherever there is a mention of the Ace Competitions website in previous versions of these terms, it should now be read as a reference to the Royal Competitions Website.',
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

      const content = buildHtmlFromSections(pageData.sections);

      const pagePayload: any = {
        slug: pageData.slug,
        title: pageData.title,
        subtitle: pageData.subtitle,
        content,
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
        existingPage.content = content;
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
