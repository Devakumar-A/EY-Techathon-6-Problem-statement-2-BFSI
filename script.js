document.addEventListener('DOMContentLoaded', () => {

  // --- DOM Elements ---
  const chatWindow = document.getElementById('chat-window');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const typingIndicator = document.getElementById('typing-indicator');

  // Quick Action Buttons
  const btnCheckOffer = document.getElementById('btn-check-offer');
  const btnCheckScore = document.getElementById('btn-check-score');
  const btnApplyLoan = document.getElementById('btn-apply-loan');

  // Loan Modal
  const loanModal = document.getElementById('loan-modal');
  const loanForm = document.getElementById('loan-form');
  const loanAmountInput = document.getElementById('loan-amount');
  const loanTenureInput = document.getElementById('loan-tenure');
  const monthlySalaryInput = document.getElementById('monthly-salary');
  const fileUploadInput = document.getElementById('file-upload');
  const uploadLabelText = document.getElementById('upload-label-text');

  // Sanction Modal
  const sanctionModal = document.getElementById('sanction-modal');
  const closeSanctionBtn = document.getElementById('close-sanction-btn');
  const acceptOfferBtn = document.getElementById('accept-offer-btn');

  // --- Mock Database (Simulating CRM, Credit Bureau, Offer Mart) ---
  const mockDatabase = {
    "6383066764": {
      name: "Dev",
      kyc: "Verified",
      creditScore: 780,
      preApprovedLimit: 150000
    },
    "6385338447": {
      name: "Roney",
      kyc: "Verified",
      creditScore: 680, // <-- Too low for loan
      preApprovedLimit: 50000
    },
    "7358915542": {
      name: "Sivasubramanian",
      kyc: "Verified",
      creditScore: 740,
      preApprovedLimit: 100000 // <-- Will require salary slip
    },
    "7902467944": {
      name: "Neha Verma",
      kyc: "Pending",
      creditScore: 790,
      preApprovedLimit: 200000
    }
  };

  // --- State Management ---
  let conversationState = {
    awaiting: 'phone', // Initial state
  };
  
  let userState = {
    phone: null,
    name: null,
    profile: null,
    loanDetails: {}
  };
  let activeSliderId = 0; // To give unique IDs to sliders

  // --- Helper Functions ---
  
  // Appends a simple text message to the chat
  function appendMessage(text, sender = 'bot', type = 'text') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    
    if (type === 'error') msgDiv.classList.add('bot-error');
    if (type === 'action') msgDiv.classList.add('bot-action');

    msgDiv.innerHTML = text; // Use innerHTML to allow basic formatting
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll
  }

  // Simulates bot typing
  function showTyping() {
    typingIndicator.classList.remove('hidden');
    return new Promise(resolve => {
      setTimeout(() => {
        typingIndicator.classList.add('hidden');
        resolve();
      }, 900 + Math.random() * 500); // Realistic delay
    });
  }

  // Formats numbers as Indian Rupees
  function formatCurrency(num) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }
  
  // Calculates EMI (Loan Logic)
  function calculateEMI(p, r, n) {
    // p = principal, r = monthly rate, n = tenure in months
    r = r / (12 * 100); // Annual rate to monthly decimal
    if (p === 0 || r === 0 || n === 0) return 0;
    const emi = p * r * (Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    return Math.round(emi);
  }
  
  // Toggles quick action button state
  function setQuickActionsState(enabled) {
      btnCheckOffer.disabled = !enabled;
      btnCheckScore.disabled = !enabled;
      btnApplyLoan.disabled = !enabled;
  }
  
  // Initial Bot Greeting (More Persuasive)
  async function startConversation() {
    await showTyping();
    appendMessage("Welcome to TATA Capital! 🚀<br>I'm your personal AI loan assistant. Let's get you the funds you need, today!");
    appendMessage("To get started and unlock your special offers, please enter your 10-digit mobile number.");
  }

  // --- "Agentic AI" Simulations ---

  /**
   * 1. VERIFICATION AGENT (Simulated)
   * Checks KYC and basic details.
   */
  async function verificationAgent_lookup(phone) {
    await showTyping();
    const profile = mockDatabase[phone];
    
    if (profile) {
      userState.phone = phone;
      userState.name = profile.name;
      userState.profile = profile;
      
      appendMessage(`Great news, <strong>${profile.name}</strong>! Your profile is loaded and <strong>KYC is ${profile.kyc}</strong>.`);
      
      if (profile.kyc === 'Pending') {
        appendMessage(`Our records show your <strong>KYC is Pending</strong>. Don't worry, you can still apply, but we'll need to complete this step before final disbursal.`, 'bot', 'action');
      }
      
      conversationState.awaiting = null; // No longer awaiting phone
      chatInput.placeholder = "How can I help you today?";
      setQuickActionsState(true); // Enable buttons
      
      if (profile.preApprovedLimit > 0) {
        await showTyping();
        appendMessage(`Fantastic! You're pre-approved for up to <strong>${formatCurrency(profile.preApprovedLimit)}</strong>.`);
        appendMessage(`Use this live slider to see your EMI instantly. Find the amount that's perfect for you!`);
        appendSliderWidget(profile.preApprovedLimit); // Inject the slider
      }
      
    } else {
      // User not found
      appendMessage(`Sorry, we couldn't find a profile for <strong>${phone}</strong>. But no problem! You can still apply for a new loan as a guest.`, 'bot');
      userState.name = "Guest";
      userState.phone = phone;
      userState.profile = { name: "Guest", kyc: "N/A", creditScore: 0, preApprovedLimit: 0 }; // Create guest profile
      
      conversationState.awaiting = null;
      chatInput.placeholder = "Click 'Apply for a Loan' to start";
      btnApplyLoan.disabled = false; // Only allow applying
    }
  }

  /**
   * In-Chat EMI Slider
   */
  function appendSliderWidget(maxAmount) {
    activeSliderId++; // Increment to create unique IDs for elements
    const widgetId = `slider-widget-${activeSliderId}`;
    const sliderId = `loan-slider-${activeSliderId}`;
    const displayId = `emi-display-${activeSliderId}`;
    
    const defaultAmount = Math.min(50000, maxAmount);

    const sliderHTML = `
      <div class="message bot slider-widget" id="${widgetId}">
        <div class="tenure-tabs">
          <button class="tenure-tab active" data-tenure="12">12 Mo</button>
          <button class="tenure-tab" data-tenure="24">24 Mo</button>
          <button class="tenure-tab" data-tenure="36">36 Mo</button>
        </div>
        
        <input type="range" id="${sliderId}" class="emi-slider" 
               min="10000" max="${maxAmount}" 
               value="${defaultAmount}" step="1000">
        
        <div class="slider-labels">
          <span>${formatCurrency(10000)}</span>
          <span>${formatCurrency(maxAmount)}</span>
        </div>
        
        <div class="emi-display" id="${displayId}">
          Your EMI: <strong>${formatCurrency(0)}</strong> / mo
        </div>
      </div>
    `;
    
    chatWindow.innerHTML += sliderHTML;
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll
    
    const sliderWidget = document.getElementById(widgetId);
    const slider = document.getElementById(sliderId);
    const tenureTabs = sliderWidget.querySelectorAll('.tenure-tab');
    
    const updateSliderEMI = () => {
      const p = parseInt(slider.value); // Principal
      const n = parseInt(sliderWidget.querySelector('.tenure-tab.active').dataset.tenure); // Tenure
      const r = 14.0; // Assume 14% rate
      
      const emi = calculateEMI(p, r, n);
      
      const display = document.getElementById(displayId);
      display.innerHTML = `Amount: <strong>${formatCurrency(p)}</strong> | EMI: <strong>${formatCurrency(emi)}</strong> / mo`;
    };
    
    slider.addEventListener('input', updateSliderEMI);
    
    tenureTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tenureTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        updateSliderEMI();
      });
    });
    
    updateSliderEMI();
  }


  /**
   * 2. SALES AGENT (Simulated)
   * Checks for pre-approved offers.
   */
  async function salesAgent_checkOffers() {
    await showTyping();
    const limit = userState.profile.preApprovedLimit;
    if (limit > 0) {
      appendMessage(`🎉 Fantastic news, <strong>${userState.name}</strong>! You have a special, pre-approved personal loan offer of <strong>${formatCurrency(limit)}</strong>.`);
      appendMessage(`This is ready for you right now. You can use it for anything—a vacation, home renovation, or an emergency.`);
      appendSliderWidget(limit); // Show the slider on request too
    } else {
      appendMessage(`There are no pre-approved offers for you right now, but that's okay! Based on your profile, you can still apply for a new loan and get a decision in minutes.`);
    }
  }

  /**
   * 3. UNDERWRITING AGENT (Simulated)
   * Fetches the credit score.
   */
  async function underwritingAgent_checkScore() {
    await showTyping();
    const score = userState.profile.creditScore;
    if (score > 0) {
      appendMessage(`Your registered credit score is <strong>${score}</strong>.`);
      
      if (score >= 750) {
        appendMessage(`That's an <strong>excellent score</strong>! This unlocks our best interest rates. It's a great time to use that score to your advantage.`);
      } else if (score >= 700) {
        appendMessage(`You have a <strong>solid score</strong>, which makes you eligible for our standard loan products.`);
      } else {
        appendMessage(`Your score is a bit low. This might limit your loan amount, but let's see what we can do. Applying for a smaller amount might be a good option.`, 'bot', 'error');
      }
    } else {
      appendMessage(`We couldn't retrieve a credit score for your profile. We can still proceed, but the decision will be based on your salary and other details.`);
    }
  }

  /**
   * 4. UNDERWRITING AGENT (Simulated)
   * Evaluates a loan application based on EY Problem Statement rules.
   */
  async function underwritingAgent_evaluateLoan() {
    await showTyping();
    appendMessage("Verifying your details... Just a moment.");
    
    const { amount, tenure, salary } = userState.loanDetails;
    const { creditScore, preApprovedLimit } = userState.profile;
    
    await showTyping();

    // RULE 1: Credit Score Check
    if (creditScore < 700) {
      appendMessage(`<strong>Application Rejected.</strong><br>Reason: Your credit score (${creditScore}) is below our minimum requirement of 700.`, 'bot', 'error');
      appendMessage("We recommend improving your score and trying again in a few months.");
      return;
    }
    
    appendMessage("✅ Credit score check passed.");
    await showTyping();
    
    // RULE 2: Amount vs Pre-Approved Limit (Instant Approve)
    if (amount <= preApprovedLimit) {
      appendMessage("✅ Loan amount is within your pre-approved limit.");
      await showTyping();
      appendMessage(`<strong>Application Approved!</strong><br>Congratulations! Because the amount is within your limit, no salary slip verification was needed.`, 'bot', 'action');
      sanctionLetterAgent_generate();
      return;
    }
    
    // RULE 3: Amount > 2x Pre-Approved Limit (Instant Reject)
    if (amount > (preApprovedLimit * 2) && preApprovedLimit > 0) {
      appendMessage(`<strong>Application Rejected.</strong><br>Reason: The requested amount (${formatCurrency(amount)}) is more than double your pre-approved limit (${formatCurrency(preApprovedLimit * 2)}).`, 'bot', 'error');
      appendMessage(`You can re-apply for an amount up to <strong>${formatCurrency(preApprovedLimit * 2)}</strong>.`);
      return;
    }

    appendMessage("✅ Loan amount check passed. Proceeding with salary verification...");
    await showTyping();

    // RULE 4: Amount between 1x and 2x Limit (Salary Slip Check)
    if (!fileUploadInput.files || fileUploadInput.files.length === 0) {
         appendMessage(`<strong>Application Hold.</strong><br>Reason: A salary slip is required to process this loan amount, but no file was uploaded.`, 'bot', 'error');
         appendMessage("Please click 'Apply for a Loan' again and be sure to upload your document.");
         return;
    }
    
    appendMessage(`Processing salary slip: '${fileUploadInput.files[0].name}'...`);
    
    // EMI CHECK (Rule 4b)
    const emi = calculateEMI(amount, 14, tenure);
    const maxEmi = salary * 0.50;
    
    await showTyping();
    appendMessage(`Your estimated EMI for this loan is <strong>${formatCurrency(emi)}</strong>.`);
    appendMessage(`Our policy requires your EMI to be no more than 50% of your salary (<strong>${formatCurrency(maxEmi)}</strong>).`);
    await showTyping();

    if (emi <= maxEmi) {
      appendMessage(`✅ EMI check passed!`);
      await showTyping();
      appendMessage(`<strong>Application Approved!</strong><br>Congratulations! Your declared salary is sufficient for this loan.`, 'bot', 'action');
      sanctionLetterAgent_generate();
    } else {
      appendMessage(`<strong>Application Rejected.</strong><br>Reason: Your estimated EMI (${formatCurrency(emi)}) exceeds 50% of your monthly salary.`, 'bot', 'error');
      const newAmount = (maxEmi / (emi / amount)); // Calculate affordable amount
      appendMessage(`However, you would be eligible for a loan of approximately <strong>${formatCurrency(newAmount)}</strong> with the same tenure. Would you like to apply for that amount?`);
    }
  }
  
  /**
   * 5. SANCTION LETTER AGENT (Simulated)
   * Populates the modal and triggers the PDF download.
   */
  async function sanctionLetterAgent_generate() {
    await showTyping();
    appendMessage(`Your loan is approved! We are generating your provisional sanction letter. Please check the pop-up and your downloads.`, 'bot', 'action');
    
    const { amount, tenure } = userState.loanDetails;
    const emi = calculateEMI(amount, 14, tenure);

    // Populate modal
    document.getElementById('sanction-date').innerText = new Date().toLocaleDateString('en-IN');
    document.getElementById('sanction-name').innerText = userState.name;
    document.getElementById('sanction-id').innerText = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('sanction-amount').innerText = formatCurrency(amount);
    document.getElementById('sanction-tenure').innerText = `${tenure} Months`;
    document.getElementById('sanction-emi').innerText = `${formatCurrency(emi)} (Approx.)`;
    
    // Show modal
    sanctionModal.classList.remove('hidden');

    // **NEW STEP: Call the PDF downloader**
    // We add a small delay to ensure the modal is fully rendered before html2canvas runs
    setTimeout(() => {
      downloadSanctionLetter(userState.name);
    }, 500);
  }

  /**
   * 6. NEW PDF DOWNLOADER FUNCTION
   * Uses jsPDF and html2canvas to save the modal content as a PDF.
   */
  async function downloadSanctionLetter(customerName) {
    try {
      // Access the jsPDF library
      const { jsPDF } = window.jspdf;
      
      // Get the specific element to print
      const letterElement = document.getElementById('letter-content-to-print');
      
      // Run html2canvas to "screenshot" the element
      const canvas = await html2canvas(letterElement, {
        scale: 2, // Use a higher scale for better PDF quality
        useCORS: true // In case any images are used
      });
      
      // Get the image data from the canvas
      const imgData = canvas.toDataURL('image/png');
      
      // Create a new PDF document in A4 size
      const doc = new jsPDF('p', 'mm', 'a4'); // p = portrait, mm = millimeters, a4
      
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Maintain aspect ratio
      
      // Add the image to the PDF
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Create a filename and save the PDF
      const fileName = `Sanction_Letter_${customerName.replace(/ /g, '_')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Error generating PDF:", error);
      appendMessage("Sorry, there was an error generating your PDF sanction letter.", 'bot', 'error');
    }
  }


  /**
   * MASTER AGENT (Simulated)
   * Manages the conversation flow and calls other agents.
   */
  async function masterAgent_handleInput(message) {
    if (conversationState.awaiting === 'phone') {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (phoneRegex.test(message)) {
        await verificationAgent_lookup(message);
      } else {
        appendMessage("Please enter a valid 10-digit Indian mobile number to unlock your offers.", 'bot', 'error');
      }
    } else {
      // Basic keyword matching
      if (message.includes('loan') || message.includes('apply')) {
        btnApplyLoan.click();
      } else if (message.includes('offer')) {
        btnCheckOffer.click();
      } else if (message.includes('score') || message.includes('credit')) {
        btnCheckScore.click();
      } else if (message.includes('hi') || message.includes('hello')) {
        appendMessage(`Hello, ${userState.name || 'there'}! How can I help you? You can use the buttons below to get started.`);
      } else if (message.includes('yes') || message.includes('proceed')) {
        appendMessage("Great! Please click 'Apply for a Loan' and let's get those details.", 'bot', 'action');
      }
      else {
        appendMessage("Sorry, I didn't quite catch that. Please use the quick action buttons or ask about 'loan', 'offer', or 'score'.");
      }
    }
  }

  // --- Event Listeners ---

  // Handle Send Button click
  sendBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (!message) return;
    
    appendMessage(message, 'user');
    masterAgent_handleInput(message.toLowerCase());
    chatInput.value = '';
  });

  // Handle "Enter" key
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  // --- Quick Action Listeners ---
  btnCheckOffer.addEventListener('click', () => {
    appendMessage("Show me my pre-approved offer", 'user');
    salesAgent_checkOffers();
  });
  
  btnCheckScore.addEventListener('click', () => {
    appendMessage("What is my credit score?", 'user');
    underwritingAgent_checkScore();
  });
  
  btnApplyLoan.addEventListener('click', () => {
    appendMessage("I want to apply for a loan", 'user');
    
    if (userState.profile.kyc === "Pending") {
        appendMessage("Just a reminder: Your KYC is pending. We can still process your application, but final approval will require KYC verification.", 'bot', 'action');
    }
    appendMessage("Excellent choice! Please fill out the secure form to proceed.");
    
    loanForm.reset();
    uploadLabelText.innerText = "Click to Upload Salary Slip (PDF/JPG)";
    
    loanModal.classList.remove('hidden');
  });
  
  // Show file name on upload
  fileUploadInput.addEventListener('change', () => {
      if (fileUploadInput.files.length > 0) {
          uploadLabelText.innerText = `✅ File selected: ${fileUploadInput.files[0].name}`;
          uploadLabelText.style.color = "#28a745";
      } else {
          uploadLabelText.innerText = "Click to Upload Salary Slip (PDF/JPG)";
          uploadLabelText.style.color = "#0d47a1";
      }
  });

  // --- Modal Listeners ---
  
  // Handle Loan Form Submission
  loanForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    userState.loanDetails = {
      amount: parseInt(loanAmountInput.value),
      tenure: parseInt(loanTenureInput.value),
      salary: parseInt(monthlySalaryInput.value)
    };
    
    loanModal.classList.add('hidden');
    appendMessage(`<strong>Application Submitted:</strong><br>
      - Amount: ${formatCurrency(userState.loanDetails.amount)}<br>
      - Tenure: ${userState.loanDetails.tenure} Months<br>
      - Salary: ${formatCurrency(userState.loanDetails.salary)}`);
      
    if (fileUploadInput.files.length > 0) {
        appendMessage(`- Salary Slip: ${fileUploadInput.files[0].name} attached.`);
    }

    underwritingAgent_evaluateLoan();
  });

  // Close Sanction Letter
  closeSanctionBtn.addEventListener('click', () => {
    sanctionModal.classList.add('hidden');
  });
  
  acceptOfferBtn.addEventListener('click', () => {
    sanctionModal.classList.add('hidden');
    appendMessage("I accept the offer!", 'user');
    appendMessage("Thank you for accepting! A relationship manager will contact you shortly to complete the final (mock) verification and disbursal.", 'bot', 'action');
  });

  // --- Start the conversation ---
  startConversation();

});