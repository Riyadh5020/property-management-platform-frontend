export interface GuideText {
  title: string;
  purpose: string;
  steps: string[];
  example: string;
}

export interface PageGuideContent {
  en: GuideText;
  bn: GuideText;
}

const guides: Record<string, PageGuideContent> = {
  "/dashboard": {
    en: {
      title: "Dashboard",
      purpose:
        "Your starting point. It shows what needs attention and how your buildings are doing.",
      steps: [
        "Check the To do box first. Click a line to go straight to that work.",
        "Use the four quick buttons for common jobs, such as adding a tenant or recording rent.",
        "Look at the numbers to see your properties, units and how many are occupied.",
      ],
      example:
        'To do says "Rent invoices waiting for payment: 2". Click it, and Rent & billing opens so you can record the payments.',
    },
    bn: {
      title: "ড্যাশবোর্ড",
      purpose:
        "এখান থেকেই শুরু করুন। কোন কাজ বাকি আর আপনার বিল্ডিংগুলোর অবস্থা কী, তা এখানে দেখা যায়।",
      steps: [
        "প্রথমে To do বক্স দেখুন। কোনো লাইনে ক্লিক করলে সরাসরি সেই কাজে চলে যাবেন।",
        "টেনান্ট যোগ বা ভাড়া রেকর্ডের মতো কাজের জন্য চারটি দ্রুত বাটন ব্যবহার করুন।",
        "সংখ্যাগুলো দেখে বুঝুন কয়টি প্রপার্টি ও ইউনিট আছে, আর কয়টি ভাড়া হয়েছে।",
      ],
      example:
        'To do-তে লেখা "Rent invoices waiting for payment: 2"। ক্লিক করলে Rent & billing খুলবে, সেখানে পেমেন্ট রেকর্ড করুন।',
    },
  },
  "/admin": {
    en: {
      title: "Admin overview",
      purpose:
        "The health of the business: income, money still owed, and how many owners are paying, on trial or expired.",
      steps: [
        "Monthly recurring revenue is what active paid plans bring in each month, at list price.",
        "Waiting to be paid is the total of due subscription invoices. Open Billing to record payments.",
        "Plans in use shows which plans are most popular.",
      ],
      example:
        "Waiting to be paid shows ৳4,900. Open Billing, find the due invoice, and click Mark paid when the owner pays.",
    },
    bn: {
      title: "অ্যাডমিন ওভারভিউ",
      purpose:
        "ব্যবসার অবস্থা: আয়, বাকি টাকা, আর কতজন ওনার পেমেন্ট করছেন, ট্রায়ালে আছেন বা মেয়াদ শেষ।",
      steps: [
        "Monthly recurring revenue হলো চালু পেইড প্ল্যান থেকে প্রতি মাসের আয়, প্ল্যানের নির্ধারিত দামে।",
        "Waiting to be paid হলো বাকি থাকা সাবস্ক্রিপশন ইনভয়েসের মোট টাকা। পেমেন্ট রেকর্ড করতে Billing খুলুন।",
        "Plans in use দেখায় কোন প্ল্যান বেশি চলছে।",
      ],
      example:
        "Waiting to be paid-এ ৳4,900 দেখাচ্ছে। Billing খুলে বাকি ইনভয়েসটি খুঁজুন, ওনার টাকা দিলে Mark paid চাপুন।",
    },
  },
  "/properties": {
    en: {
      title: "Properties",
      purpose: "Your buildings. A property holds its floors, units and subscription details.",
      steps: [
        "Owners: to add a building, send a request from the Requests page.",
        "Super admin: click New property and choose the owner and plan.",
        "Click the pencil icon to see or edit a property and its subscription.",
      ],
      example:
        "You bought Rose Tower with 5 floors. Send a property request. Once approved, the property and floors 1 to 5 appear by themselves.",
    },
    bn: {
      title: "প্রপার্টি",
      purpose:
        "আপনার বিল্ডিংগুলো। প্রতিটি প্রপার্টিতে তার ফ্লোর, ইউনিট আর সাবস্ক্রিপশনের তথ্য থাকে।",
      steps: [
        "ওনার: নতুন বিল্ডিং যোগ করতে Requests পেজ থেকে রিকোয়েস্ট পাঠান।",
        "সুপার অ্যাডমিন: New property চেপে ওনার ও প্ল্যান বেছে নিন।",
        "পেন্সিল আইকনে ক্লিক করে প্রপার্টি ও সাবস্ক্রিপশন দেখুন বা ঠিক করুন।",
      ],
      example:
        "আপনি ৫ তলার Rose Tower কিনেছেন। প্রপার্টি রিকোয়েস্ট পাঠান। অনুমোদন হলে প্রপার্টি আর ১ থেকে ৫ নম্বর ফ্লোর নিজে থেকেই চলে আসবে।",
    },
  },
  "/floors": {
    en: {
      title: "Floors",
      purpose: "The floors of each building, and the way in to their units.",
      steps: [
        "Find the floor you want. Use the filter to pick a building.",
        "Click Manage units to set how many units it holds and to add them.",
        "Need more floors? Owners send a floor request from the Requests page.",
      ],
      example:
        "Floor 2 has shops, not flats. Click Manage units on Floor 2, set the unit cap to 3, and add the shops.",
    },
    bn: {
      title: "ফ্লোর",
      purpose: "প্রতিটি বিল্ডিংয়ের ফ্লোর, আর সেখান থেকেই ইউনিটে যাওয়া যায়।",
      steps: [
        "যে ফ্লোর দরকার সেটি খুঁজুন। ফিল্টার দিয়ে বিল্ডিং বেছে নিন।",
        "Manage units চেপে ঠিক করুন কয়টি ইউনিট থাকবে, তারপর সেগুলো যোগ করুন।",
        "আরও ফ্লোর লাগলে ওনার Requests পেজ থেকে ফ্লোর রিকোয়েস্ট পাঠাবেন।",
      ],
      example:
        "২ তলায় ফ্ল্যাট নয়, দোকান আছে। Floor 2-এ Manage units চাপুন, unit cap 3 দিন, তারপর দোকানগুলো যোগ করুন।",
    },
  },
  "/units": {
    en: {
      title: "Units",
      purpose: "Every flat, shop or office, with its rent and status.",
      steps: [
        "Open a floor to see its units.",
        "Set the unit cap first. It is how many units that floor can hold, and you can change it later.",
        "Add units one at a time or in bulk, or copy the layout from another floor.",
      ],
      example:
        "Floors 3 and 4 have the same layout. Add the units on Floor 3, then copy the layout to Floor 4 instead of typing them again.",
    },
    bn: {
      title: "ইউনিট",
      purpose: "প্রতিটি ফ্ল্যাট, দোকান বা অফিস, সাথে তার ভাড়া ও অবস্থা।",
      steps: [
        "ইউনিট দেখতে একটি ফ্লোর খুলুন।",
        "প্রথমে unit cap দিন, অর্থাৎ ওই ফ্লোরে কয়টি ইউনিট থাকবে। পরে এটি বদলানো যায়।",
        "একটি একটি করে বা একসাথে অনেক ইউনিট যোগ করুন, অথবা অন্য ফ্লোরের লেআউট কপি করুন।",
      ],
      example:
        "৩ ও ৪ তলার লেআউট একই। ৩ তলায় ইউনিট যোগ করে লেআউটটি ৪ তলায় কপি করুন, আবার টাইপ করতে হবে না।",
    },
  },
  "/flat-status": {
    en: {
      title: "Flat status",
      purpose:
        "One view of every flat: who lives there, when the lease ends, and any open repairs or overdue rent.",
      steps: [
        "Search by unit code or building.",
        "Filter by occupancy to see, for example, only vacant flats.",
        "This page only shows information. Make changes on the Tenants, Leases or Maintenance pages.",
      ],
      example:
        "Someone asks for an empty flat. Filter by vacant and you can see at once which ones are free.",
    },
    bn: {
      title: "ফ্ল্যাটের অবস্থা",
      purpose: "এক জায়গায় সব ফ্ল্যাট: কে থাকেন, লিজ কবে শেষ, মেরামত বা বকেয়া ভাড়া আছে কিনা।",
      steps: [
        "ইউনিট কোড বা বিল্ডিংয়ের নাম দিয়ে খুঁজুন।",
        "ফিল্টার দিয়ে যেমন শুধু খালি ফ্ল্যাটগুলো দেখুন।",
        "এই পেজ শুধু দেখার জন্য। পরিবর্তন করতে Tenants, Leases বা Maintenance পেজে যান।",
      ],
      example: "কেউ খালি ফ্ল্যাট চাইলেন। vacant ফিল্টার করলেই দেখবেন কোনগুলো খালি।",
    },
  },
  "/tenants": {
    en: {
      title: "Tenants",
      purpose: "The people living in or renting your units, with their contact and ID details.",
      steps: [
        "Click New tenant.",
        "Choose the building, floor and unit, then enter the name. Phone, ID and the other details are optional but useful.",
        "Next, create a lease on the Leases page so rent can be billed.",
      ],
      example:
        "Rahim moves into 4B. Add Rahim here with his phone and NID, then create his lease with a rent of ৳15,000.",
    },
    bn: {
      title: "টেনান্ট",
      purpose: "যাঁরা আপনার ইউনিটে থাকেন বা ভাড়া নিয়েছেন, তাঁদের যোগাযোগ ও পরিচয়পত্রের তথ্য।",
      steps: [
        "New tenant চাপুন।",
        "বিল্ডিং, ফ্লোর ও ইউনিট বেছে নাম লিখুন। ফোন, আইডি ও অন্যান্য তথ্য ঐচ্ছিক, তবে কাজে লাগে।",
        "এরপর Leases পেজে লিজ তৈরি করুন, তাহলে ভাড়ার বিল হবে।",
      ],
      example:
        "রহিম 4B-তে উঠলেন। ফোন ও NID দিয়ে এখানে রহিমকে যোগ করুন, তারপর ৳১৫,০০০ ভাড়ায় তাঁর লিজ তৈরি করুন।",
    },
  },
  "/leases": {
    en: {
      title: "Leases",
      purpose:
        "The rent agreement between you and a tenant. Monthly rent invoices come from active leases.",
      steps: [
        "Add the tenant first, then click New lease.",
        "Choose the unit and tenant, then enter the dates and monthly rent.",
        "Set the status to active. The unit then shows as occupied once the start date arrives.",
        "To end a lease, change its status. The unit becomes vacant again.",
      ],
      example:
        "Rahim rents 4B for one year at ৳15,000. Create an active lease for those dates, and an invoice is created for him each month.",
    },
    bn: {
      title: "লিজ",
      purpose: "আপনার ও টেনান্টের ভাড়ার চুক্তি। চালু লিজ থেকেই প্রতি মাসের ভাড়ার ইনভয়েস হয়।",
      steps: [
        "আগে টেনান্ট যোগ করুন, তারপর New lease চাপুন।",
        "ইউনিট ও টেনান্ট বেছে তারিখ ও মাসিক ভাড়া লিখুন।",
        "স্ট্যাটাস active করুন। শুরুর তারিখ এলে ইউনিট occupied দেখাবে।",
        "লিজ শেষ করতে স্ট্যাটাস বদলান। ইউনিট আবার vacant হবে।",
      ],
      example:
        "রহিম এক বছরের জন্য ৳১৫,০০০ ভাড়ায় 4B নিলেন। ওই তারিখ দিয়ে active লিজ করুন, প্রতি মাসে তাঁর ইনভয়েস তৈরি হবে।",
    },
  },
  "/billing": {
    en: {
      title: "Rent & billing",
      purpose:
        "Rent invoices and payments. Each active lease gets an invoice automatically every month.",
      steps: [
        "Find the invoice and click the Open (eye) icon.",
        "Add any extra charges and click Save charges.",
        "When the tenant pays, enter the amount and click Record payment. Part payments are allowed.",
        "Click Receipt next to a payment to print it. Use Reverse to correct a mistake.",
      ],
      example:
        "Rahim owes ৳15,000 and pays ৳10,000 by bKash. Record ৳10,000. The invoice shows partial with ৳5,000 still due.",
    },
    bn: {
      title: "ভাড়া ও বিল",
      purpose:
        "ভাড়ার ইনভয়েস ও পেমেন্ট। প্রতিটি চালু লিজের ইনভয়েস প্রতি মাসে নিজে থেকেই তৈরি হয়।",
      steps: [
        "ইনভয়েস খুঁজে Open (চোখ) আইকনে ক্লিক করুন।",
        "বাড়তি চার্জ থাকলে লিখে Save charges চাপুন।",
        "টেনান্ট টাকা দিলে পরিমাণ লিখে Record payment চাপুন। আংশিক পেমেন্টও নেওয়া যায়।",
        "রসিদ প্রিন্ট করতে পেমেন্টের পাশে Receipt চাপুন। ভুল হলে Reverse দিয়ে ঠিক করুন।",
      ],
      example:
        "রহিমের বাকি ৳১৫,০০০, তিনি bKash-এ ৳১০,০০০ দিলেন। ৳১০,০০০ রেকর্ড করুন। ইনভয়েসে partial আর ৳৫,০০০ বাকি দেখাবে।",
    },
  },
  "/maintenance": {
    en: {
      title: "Maintenance",
      purpose:
        "Repairs from request to finish. A manager's request needs the owner's approval before work starts.",
      steps: [
        "Click New work order and describe the problem.",
        "Owner: click Review on a pending request, adjust it if needed, add a note, then approve or reject.",
        "Once approved, update the status as work moves on.",
        "When it is completed with a cost, an expense is added automatically.",
      ],
      example:
        "The lift is broken. The manager adds a work order, the owner approves it with a ৳5,000 limit, and on completion ৳4,500 goes to Expenses by itself.",
    },
    bn: {
      title: "মেরামত",
      purpose:
        "রিকোয়েস্ট থেকে শেষ পর্যন্ত মেরামতের কাজ। ম্যানেজারের রিকোয়েস্টে কাজ শুরুর আগে ওনারের অনুমোদন লাগে।",
      steps: [
        "New work order চেপে সমস্যাটি লিখুন।",
        "ওনার: pending রিকোয়েস্টে Review চাপুন, দরকার হলে বদলান, নোট লিখে approve বা reject করুন।",
        "অনুমোদনের পর কাজ যেমন এগোয় তেমন স্ট্যাটাস বদলান।",
        "খরচসহ completed হলে Expenses-এ নিজে থেকেই খরচ যোগ হবে।",
      ],
      example:
        "লিফট নষ্ট। ম্যানেজার work order দিলেন, ওনার ৳৫,০০০ সীমায় অনুমোদন করলেন, শেষে ৳৪,৫০০ নিজে থেকেই Expenses-এ গেল।",
    },
  },
  "/expenses": {
    en: {
      title: "Expenses",
      purpose: "Money spent on your buildings, such as bills, salaries and supplies.",
      steps: [
        "Click New expense.",
        "Choose the building and category, then enter the title, amount and date.",
        "Use the filters to see spending by category or month.",
      ],
      example:
        "You paid ৳2,000 for cleaning supplies. Add an expense under supplies with that date.",
    },
    bn: {
      title: "খরচ",
      purpose: "বিল্ডিংয়ের জন্য খরচ করা টাকা, যেমন বিল, বেতন ও সরঞ্জাম।",
      steps: [
        "New expense চাপুন।",
        "বিল্ডিং ও ক্যাটাগরি বেছে নাম, টাকা ও তারিখ লিখুন।",
        "ফিল্টার দিয়ে ক্যাটাগরি বা মাস অনুযায়ী খরচ দেখুন।",
      ],
      example:
        "পরিষ্কারের জিনিস কিনতে ৳২,০০০ খরচ হলো। supplies ক্যাটাগরিতে ওই তারিখে খরচ যোগ করুন।",
    },
  },
  "/utilities": {
    en: {
      title: "Utilities",
      purpose: "Electricity, gas, water and service charge bills, flat by flat.",
      steps: [
        "Click New utility bill and choose the building.",
        "Type the exact unit code and the month as YYYY-MM.",
        "Enter the amount, or the meter readings and rate to have it worked out.",
        "The bill then goes on that unit's rent invoice for the month. Bills for areas like Common area do not.",
      ],
      example:
        "4B used 50 units of electricity at ৳8. Enter unit 4B, month 2026-11, readings 100 and 150, rate 8. The ৳400 bill goes on Rahim's November invoice.",
    },
    bn: {
      title: "ইউটিলিটি",
      purpose: "ফ্ল্যাট অনুযায়ী বিদ্যুৎ, গ্যাস, পানি ও সার্ভিস চার্জের বিল।",
      steps: [
        "New utility bill চেপে বিল্ডিং বেছে নিন।",
        "হুবহু ইউনিট কোড আর মাস YYYY-MM আকারে লিখুন।",
        "টাকা লিখুন, অথবা মিটার রিডিং ও রেট দিলে হিসাব নিজে হবে।",
        "বিলটি ওই মাসের ভাড়ার ইনভয়েসে যোগ হবে। Common area-র মতো জায়গার বিল যোগ হবে না।",
      ],
      example:
        "4B ৳৮ রেটে ৫০ ইউনিট বিদ্যুৎ খরচ করেছে। ইউনিট 4B, মাস 2026-11, রিডিং 100 ও 150, রেট 8 দিন। ৳৪০০ বিল রহিমের নভেম্বরের ইনভয়েসে যাবে।",
    },
  },
  "/parking": {
    en: {
      title: "Parking",
      purpose: "Parking slots, which unit uses each one, and the monthly fee.",
      steps: [
        "Click New slot and enter the slot number.",
        "Choose the unit that uses it, add the vehicle number and monthly fee.",
        "The fee is added to that unit's rent invoice each month.",
      ],
      example:
        "Slot P-12 goes to flat 4B for ৳2,000 a month. From the next invoice, Rahim is charged ৳2,000 under Parking & other.",
    },
    bn: {
      title: "পার্কিং",
      purpose: "পার্কিং স্লট, কোন ইউনিট কোনটি ব্যবহার করছে, আর মাসিক ফি।",
      steps: [
        "New slot চেপে স্লট নম্বর লিখুন।",
        "যে ইউনিট ব্যবহার করবে সেটি বেছে গাড়ির নম্বর ও মাসিক ফি দিন।",
        "প্রতি মাসে ফি ওই ইউনিটের ভাড়ার ইনভয়েসে যোগ হবে।",
      ],
      example:
        "P-12 স্লট মাসে ৳২,০০০ ফিতে 4B পেল। পরের ইনভয়েস থেকে রহিমের Parking & other-এ ৳২,০০০ যোগ হবে।",
    },
  },
  "/visitors": {
    en: {
      title: "Visitors",
      purpose: "A log of guests, deliveries and incidents at the gate.",
      steps: [
        "Click New visitor when someone arrives.",
        "Enter the name, the building, who they are visiting and the time.",
        "When they leave, edit the entry, add the time and set the status to Checked out.",
      ],
      example:
        "A courier comes for 4B at 2:20 pm. Add the entry with purpose Delivery, then mark it Checked out when the courier leaves.",
    },
    bn: {
      title: "ভিজিটর",
      purpose: "গেটের অতিথি, ডেলিভারি ও ঘটনার খাতা।",
      steps: [
        "কেউ এলে New visitor চাপুন।",
        "নাম, বিল্ডিং, কার কাছে এসেছেন ও সময় লিখুন।",
        "চলে গেলে এন্ট্রি এডিট করে সময় লিখুন, স্ট্যাটাস Checked out করুন।",
      ],
      example:
        "দুপুর ২:২০-এ কুরিয়ার 4B-র জন্য এলো। Delivery উদ্দেশ্যে এন্ট্রি করুন, চলে গেলে Checked out করুন।",
    },
  },
  "/notices": {
    en: {
      title: "Notices",
      purpose: "Announcements for your team. Super admin announcements reach everyone.",
      steps: [
        "Click New notice and write the title and message.",
        "Choose a building, or leave it empty so it is for everyone.",
        "Set the priority so important notices stand out.",
      ],
      example:
        "Water will be off on Friday from 10 am to 2 pm. Post an Important notice for that building.",
    },
    bn: {
      title: "নোটিশ",
      purpose: "আপনার টিমের জন্য ঘোষণা। সুপার অ্যাডমিনের ঘোষণা সবাই দেখেন।",
      steps: [
        "New notice চেপে শিরোনাম ও বার্তা লিখুন।",
        "বিল্ডিং বেছে নিন, অথবা সবার জন্য হলে খালি রাখুন।",
        "জরুরি নোটিশ যেন চোখে পড়ে সেজন্য priority দিন।",
      ],
      example:
        "শুক্রবার সকাল ১০টা থেকে দুপুর ২টা পানি থাকবে না। ওই বিল্ডিংয়ের জন্য Important নোটিশ দিন।",
    },
  },
  "/amenities": {
    en: {
      title: "Amenities",
      purpose: "Shared facilities such as a gym, rooftop or hall.",
      steps: [
        "Click New amenity and choose the building.",
        "Enter how many people fit and the charge. Use 0 if it is free.",
        "Change the status when it is closed or under repair.",
      ],
      example: "The community hall holds 80 people and costs ৳5,000. Add it as Available.",
    },
    bn: {
      title: "সুবিধা",
      purpose: "সবার ব্যবহারের জায়গা, যেমন জিম, ছাদ বা হল।",
      steps: [
        "New amenity চেপে বিল্ডিং বেছে নিন।",
        "কতজন ধরে আর চার্জ কত লিখুন। ফ্রি হলে 0 দিন।",
        "বন্ধ বা মেরামতে থাকলে স্ট্যাটাস বদলান।",
      ],
      example: "কমিউনিটি হলে ৮০ জন ধরে, চার্জ ৳৫,০০০। Available হিসেবে যোগ করুন।",
    },
  },
  "/emergency-contacts": {
    en: {
      title: "Emergency contacts",
      purpose: "Who to call for fire, police, medical help or urgent repairs.",
      steps: [
        "Click New contact and choose the building.",
        "Enter the name, type and phone number.",
        "Managers can read this list when something urgent happens.",
      ],
      example:
        "Add Jamal, the on-call electrician, with his phone number. A manager can find him quickly at night.",
    },
    bn: {
      title: "জরুরি যোগাযোগ",
      purpose: "আগুন, পুলিশ, চিকিৎসা বা জরুরি মেরামতে কাকে ফোন করবেন।",
      steps: [
        "New contact চেপে বিল্ডিং বেছে নিন।",
        "নাম, ধরন ও ফোন নম্বর লিখুন।",
        "জরুরি সময়ে ম্যানেজাররা এই তালিকা দেখতে পারবেন।",
      ],
      example: "ইলেকট্রিশিয়ান জামালের নাম ও ফোন যোগ করুন। রাতে ম্যানেজার সহজেই তাঁকে পাবেন।",
    },
  },
  "/admin/admins": {
    en: {
      title: "Managers and users",
      purpose:
        "Owners add managers here and choose what they can do. Super admin manages all users.",
      steps: [
        "Click the New button at the top and enter the person's details and a password.",
        "For a manager, tick their permissions and choose their properties.",
        "Use the status to suspend someone, or the key icon to reset a password.",
        "Super admin: View as owner opens an owner's account read-only, to help with a problem.",
      ],
      example:
        "Karim will collect rent at Rose Tower only. Add him as a manager, tick only Rent, and assign only Rose Tower.",
    },
    bn: {
      title: "ম্যানেজার ও ইউজার",
      purpose:
        "ওনার এখানে ম্যানেজার যোগ করেন ও তাঁর কাজের অনুমতি ঠিক করেন। সুপার অ্যাডমিন সব ইউজার দেখেন।",
      steps: [
        "উপরের New বাটন চেপে তথ্য ও পাসওয়ার্ড দিন।",
        "ম্যানেজার হলে অনুমতিতে টিক দিন ও প্রপার্টি বেছে নিন।",
        "কাউকে বন্ধ করতে status বদলান, পাসওয়ার্ড বদলাতে চাবি আইকন চাপুন।",
        "সুপার অ্যাডমিন: সমস্যা বুঝতে View as owner দিয়ে ওনারের অ্যাকাউন্ট শুধু দেখা যায়।",
      ],
      example:
        "করিম শুধু Rose Tower-এর ভাড়া তুলবেন। তাঁকে ম্যানেজার করুন, শুধু Rent টিক দিন, শুধু Rose Tower দিন।",
    },
  },
  "/staff": {
    en: {
      title: "Staff",
      purpose:
        "Guards, cleaners and others who work in your buildings. Only the owner sees this page, because it has salaries.",
      steps: [
        "Click New staff member.",
        "Enter the name, job, building, shift, phone and salary.",
        "Update the days present and the status as needed.",
      ],
      example:
        "Shahin is the morning guard at Rose Tower on ৳16,000. Add him with the Morning shift.",
    },
    bn: {
      title: "স্টাফ",
      purpose: "গার্ড, ক্লিনার ও অন্যান্য কর্মী। বেতন থাকায় এই পেজ শুধু ওনার দেখেন।",
      steps: [
        "New staff member চাপুন।",
        "নাম, কাজ, বিল্ডিং, শিফট, ফোন ও বেতন লিখুন।",
        "দরকারমতো উপস্থিতির দিন ও স্ট্যাটাস বদলান।",
      ],
      example: "শাহিন Rose Tower-এর সকালের গার্ড, বেতন ৳১৬,০০০। Morning শিফটে তাঁকে যোগ করুন।",
    },
  },
  "/requests": {
    en: {
      title: "Requests",
      purpose: "Owners ask for a new property or more floors. Super admin approves or rejects.",
      steps: [
        "Owner: choose the property or floor tab, then click New request.",
        "You can edit or cancel a request while it is pending.",
        "Super admin: approve and pick a plan, or reject and give a reason. The owner gets an email.",
      ],
      example:
        "Rose Tower added two floors. Send a floor request for 2 more. Once approved, the new floors appear.",
    },
    bn: {
      title: "রিকোয়েস্ট",
      purpose: "ওনার নতুন প্রপার্টি বা আরও ফ্লোর চান। সুপার অ্যাডমিন অনুমোদন বা বাতিল করেন।",
      steps: [
        "ওনার: প্রপার্টি বা ফ্লোর ট্যাব বেছে New request চাপুন।",
        "pending থাকা অবস্থায় রিকোয়েস্ট এডিট বা বাতিল করা যায়।",
        "সুপার অ্যাডমিন: প্ল্যান বেছে অনুমোদন করুন, অথবা কারণ লিখে বাতিল করুন। ওনার ইমেইল পাবেন।",
      ],
      example:
        "Rose Tower-এ দুই তলা বেড়েছে। ২টি ফ্লোরের রিকোয়েস্ট পাঠান। অনুমোদন হলে নতুন ফ্লোর চলে আসবে।",
    },
  },
  "/activity": {
    en: {
      title: "Activity log",
      purpose: "A history of who changed what, and when. Entries cannot be edited.",
      steps: [
        "Read from the top; the newest changes come first.",
        "Use the type filter to narrow it down, for example to invoices.",
        "Each entry shows the old and new values of what changed.",
      ],
      example:
        "A tenant's rent looks wrong. Filter by lease to see who changed it and what it was before.",
    },
    bn: {
      title: "অ্যাক্টিভিটি লগ",
      purpose: "কে কখন কী বদলেছেন তার ইতিহাস। এগুলো এডিট করা যায় না।",
      steps: [
        "উপর থেকে পড়ুন; নতুন পরিবর্তন আগে থাকে।",
        "টাইপ ফিল্টার দিয়ে ছোট করুন, যেমন শুধু ইনভয়েস।",
        "প্রতিটি লাইনে পুরনো ও নতুন মান দেখা যায়।",
      ],
      example:
        "কোনো টেনান্টের ভাড়া ভুল মনে হচ্ছে। lease ফিল্টার করে দেখুন কে বদলেছেন আর আগে কত ছিল।",
    },
  },
  "/subscription-invoices": {
    en: {
      title: "Billing",
      purpose:
        "Invoices for the EstateOps subscription, not tenant rent. Rent is on the Rent & billing page.",
      steps: [
        "An invoice appears by itself when a paid plan starts or renews.",
        "Owner: use a discount code with Use coupon, and pay the way you agreed with support.",
        "Super admin: when money arrives, click Mark paid. This records it; it does not take money.",
      ],
      example:
        "Rose Tower's ৳4,900 plan renews. Using code SAVE10 makes it ৳4,410. When the bKash payment arrives, super admin marks it paid.",
    },
    bn: {
      title: "বিলিং",
      purpose:
        "EstateOps সাবস্ক্রিপশনের ইনভয়েস, টেনান্টের ভাড়া নয়। ভাড়া থাকে Rent & billing পেজে।",
      steps: [
        "পেইড প্ল্যান শুরু বা নবায়ন হলে ইনভয়েস নিজে থেকেই আসে।",
        "ওনার: Use coupon দিয়ে ডিসকাউন্ট কোড দিন, আর সাপোর্টের সাথে ঠিক করা উপায়ে টাকা দিন।",
        "সুপার অ্যাডমিন: টাকা এলে Mark paid চাপুন। এটি শুধু রেকর্ড করে, টাকা কাটে না।",
      ],
      example:
        "Rose Tower-এর ৳৪,৯০০ প্ল্যান নবায়ন হলো। SAVE10 কোড দিলে ৳৪,৪১০ হবে। bKash-এ টাকা এলে সুপার অ্যাডমিন paid করবেন।",
    },
  },
  "/export": {
    en: {
      title: "Export data",
      purpose: "Download a copy of your records to open in Excel or Google Sheets.",
      steps: [
        "Find the kind of record you want.",
        "Click Download and the file is saved to your computer.",
        "Keep tenant files safe, because they include private details.",
      ],
      example:
        "Your accountant needs this year's expenses. Download Expenses and send them the file.",
    },
    bn: {
      title: "ডেটা এক্সপোর্ট",
      purpose: "আপনার তথ্যের কপি নামিয়ে Excel বা Google Sheets-এ খুলুন।",
      steps: [
        "কোন তথ্য দরকার সেটি খুঁজুন।",
        "Download চাপলে ফাইল আপনার কম্পিউটারে চলে আসবে।",
        "টেনান্টের ফাইলে ব্যক্তিগত তথ্য থাকে, তাই নিরাপদে রাখুন।",
      ],
      example: "হিসাবরক্ষকের এ বছরের খরচ দরকার। Expenses নামিয়ে ফাইলটি পাঠান।",
    },
  },
  "/tickets": {
    en: {
      title: "Support",
      purpose: "Tell support about a problem and read the reply here.",
      steps: [
        "Owner: click New support ticket and describe the problem.",
        "Come back to this page to read the reply and the status.",
        "Super admin: click the pencil icon on a ticket to reply and change its status.",
      ],
      example:
        "A receipt will not print. Open a ticket saying which invoice it was, and read the answer here.",
    },
    bn: {
      title: "সাপোর্ট",
      purpose: "সাপোর্টকে সমস্যা জানান আর উত্তর এখানেই পড়ুন।",
      steps: [
        "ওনার: New support ticket চেপে সমস্যাটি লিখুন।",
        "উত্তর ও স্ট্যাটাস দেখতে এই পেজে ফিরে আসুন।",
        "সুপার অ্যাডমিন: টিকিটের পেন্সিল আইকন চেপে উত্তর দিন ও স্ট্যাটাস বদলান।",
      ],
      example: "রসিদ প্রিন্ট হচ্ছে না। কোন ইনভয়েস তা লিখে টিকিট খুলুন, উত্তর এখানেই পড়ুন।",
    },
  },
  "/subscriptions": {
    en: {
      title: "Plans",
      purpose: "The subscription plans you sell, with their price and limits.",
      steps: [
        "Click New plan and enter the name, billing cycle and price.",
        "Set the limits for properties, floors and managers. Leave one blank for no limit.",
        "A plan in use cannot be deleted. Set it to inactive instead.",
      ],
      example: "Create a Starter plan at ৳4,900 a month with 1 property, 10 floors and 2 managers.",
    },
    bn: {
      title: "প্ল্যান",
      purpose: "আপনার বিক্রি করা সাবস্ক্রিপশন প্ল্যান, দাম ও সীমাসহ।",
      steps: [
        "New plan চেপে নাম, বিলিং সময় ও দাম লিখুন।",
        "প্রপার্টি, ফ্লোর ও ম্যানেজারের সীমা দিন। সীমা না থাকলে খালি রাখুন।",
        "ব্যবহৃত প্ল্যান ডিলিট হয় না, inactive করুন।",
      ],
      example: "মাসে ৳৪,৯০০-তে ১ প্রপার্টি, ১০ ফ্লোর ও ২ ম্যানেজারের Starter প্ল্যান বানান।",
    },
  },
  "/subscription-status": {
    en: {
      title: "Subscription status",
      purpose: "Every property's plan and how many days are left.",
      steps: [
        "The list shows the soonest to end first.",
        "Use the filter for those ending in 7 days or already expired.",
        "To renew or extend, open the property on the Properties page.",
      ],
      example:
        "A property shows 3 days left. Call the owner, then renew it from the Properties page.",
    },
    bn: {
      title: "সাবস্ক্রিপশনের অবস্থা",
      purpose: "প্রতিটি প্রপার্টির প্ল্যান আর কত দিন বাকি।",
      steps: [
        "যেটি আগে শেষ হবে সেটি আগে দেখায়।",
        "৭ দিনে শেষ হবে বা মেয়াদ শেষ, সেগুলোর জন্য ফিল্টার ব্যবহার করুন।",
        "নবায়ন বা মেয়াদ বাড়াতে Properties পেজে প্রপার্টিটি খুলুন।",
      ],
      example:
        "একটি প্রপার্টিতে ৩ দিন বাকি দেখাচ্ছে। ওনারকে ফোন করে Properties পেজ থেকে নবায়ন করুন।",
    },
  },
  "/coupons": {
    en: {
      title: "Coupons",
      purpose: "Discount codes that owners can use on a due subscription invoice.",
      steps: [
        "Enter a code and choose a percent or a fixed taka amount.",
        "Add a use limit or an end date if you want one, then click Create coupon.",
        "Use Turn off to stop a coupon at any time.",
      ],
      example:
        "For Eid, create EID20 at 20% off, limit 50 uses, ending at the end of the month, and share the code with owners.",
    },
    bn: {
      title: "কুপন",
      purpose: "ডিসকাউন্ট কোড, যা ওনাররা বাকি সাবস্ক্রিপশন ইনভয়েসে ব্যবহার করতে পারেন।",
      steps: [
        "কোড লিখে শতাংশ বা নির্দিষ্ট টাকা বেছে নিন।",
        "চাইলে ব্যবহারের সীমা বা শেষ তারিখ দিন, তারপর Create coupon চাপুন।",
        "যেকোনো সময় বন্ধ করতে Turn off চাপুন।",
      ],
      example:
        "ঈদে ২০% ছাড়ের EID20 বানান, ৫০ বার ব্যবহারের সীমা, মাস শেষে বন্ধ। কোডটি ওনারদের জানান।",
    },
  },
  "/reports": {
    en: {
      title: "Reports",
      purpose: "Charts and figures for properties, units and income.",
      steps: [
        "Read the top numbers for the overall picture.",
        "Use the charts to compare buildings and see the unit status mix.",
        "For a file of the records, use Export data.",
      ],
      example: "To see which building has the most empty units, look at the per-building figures.",
    },
    bn: {
      title: "রিপোর্ট",
      purpose: "প্রপার্টি, ইউনিট ও আয়ের চার্ট ও হিসাব।",
      steps: [
        "সার্বিক ধারণার জন্য উপরের সংখ্যাগুলো দেখুন।",
        "চার্ট দিয়ে বিল্ডিং তুলনা করুন, ইউনিটের অবস্থাও দেখুন।",
        "তথ্যের ফাইল চাইলে Export data ব্যবহার করুন।",
      ],
      example: "কোন বিল্ডিংয়ে সবচেয়ে বেশি খালি ইউনিট, তা জানতে বিল্ডিং অনুযায়ী হিসাব দেখুন।",
    },
  },
};

// A floor's own page (/units/<id>) uses the Units guide.
export function guideForPath(pathname: string): PageGuideContent | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  return guides[path] ?? (path.startsWith("/units/") ? (guides["/units"] ?? null) : null);
}

export const guidedPaths = Object.keys(guides);
