(function () {
    // 1. Detect if the current page is a login page
    const pathname = window.location.pathname.toLowerCase();
    const isLoginPage = 
        pathname.endsWith("/owner") ||
        pathname.endsWith("/owner/") ||
        pathname.includes("owner-login.html") ||
        pathname.endsWith("/admin") ||
        pathname.endsWith("/admin/") ||
        pathname.includes("adminpanel/order/login.html") ||
        (pathname.endsWith("/login.html") && !pathname.includes("adminpanel"));

    const isOwnerContext = pathname.includes("owner");
    const isAdminContext = !isOwnerContext && (pathname.includes("admin") || pathname.includes("dashboard.html"));
    const isUserContext = !isOwnerContext && !isAdminContext;

    // 2. Logout functions
    function logoutOwner() {
        console.log("Logging out Owner...");
        localStorage.removeItem("ownerId");
        localStorage.removeItem("ownerLoggedIn");
        localStorage.removeItem("ownerSessionToken");
        window.location.href = "/owner";
    }

    function logoutAdmin() {
        console.log("Logging out Admin...");
        localStorage.removeItem("adminId");
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminSessionToken");
        window.location.href = "/admin";
    }

    function logoutUser() {
        console.log("Logging out User...");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userNumber");
        localStorage.removeItem("userSessionToken");
        window.location.href = "/login.html";
    }

    // 3. Inactivity auto-logout (5 minutes)
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
    let inactivityTimer;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(triggerInactivityLogout, INACTIVITY_TIMEOUT);
    }

    function triggerInactivityLogout() {
        // Only log out if there is an active session
        const hasOwnerSession = localStorage.getItem("ownerLoggedIn") === "true";
        const hasAdminSession = localStorage.getItem("adminLoggedIn") === "true";
        const hasUserSession = localStorage.getItem("isLoggedIn") === "true";

        if (isOwnerContext && hasOwnerSession) {
            console.log("Inactivity timeout: Logging out Owner.");
            logoutOwner();
        } else if (isAdminContext && hasAdminSession) {
            console.log("Inactivity timeout: Logging out Admin.");
            logoutAdmin();
        } else if (isUserContext && hasUserSession) {
            console.log("Inactivity timeout: Logging out User.");
            logoutUser();
        }
    }

    // Initialize inactivity tracking if not on a login page
    if (!isLoginPage) {
        resetInactivityTimer();
        const activityEvents = ["mousemove", "keydown", "keypress", "click", "scroll"];
        activityEvents.forEach(event => {
            window.addEventListener(event, resetInactivityTimer, { passive: true });
        });
    }

    // 4. Global Fetch Interceptor
    const originalFetch = window.fetch;
    window.fetch = async function (resource, options = {}) {
        options.headers = options.headers || {};
        
        // Convert headers to a standard plain object for manipulation
        let headersObj = {};
        if (options.headers instanceof Headers) {
            for (let [key, value] of options.headers.entries()) {
                headersObj[key.toLowerCase()] = value;
            }
        } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
                headersObj[key.toLowerCase()] = value;
            });
        } else {
            Object.keys(options.headers).forEach(key => {
                headersObj[key.toLowerCase()] = options.headers[key];
            });
        }

        // Retrieve tokens and IDs
        const ownerToken = localStorage.getItem("ownerSessionToken");
        const ownerId = localStorage.getItem("ownerId");
        const adminToken = localStorage.getItem("adminSessionToken");
        const adminId = localStorage.getItem("adminId");
        const userToken = localStorage.getItem("userSessionToken");
        const userNumber = localStorage.getItem("userNumber");

        // Inject headers depending on the page context
        if (isOwnerContext) {
            if (ownerToken && !headersObj["x-session-token"]) {
                headersObj["x-session-token"] = ownerToken;
            }
            if (ownerId && !headersObj["x-owner-id"]) {
                headersObj["x-owner-id"] = ownerId;
            }
            if (ownerId && !headersObj["x-admin-id"]) {
                headersObj["x-admin-id"] = ownerId;
            }
        } else if (isAdminContext) {
            if (adminToken && !headersObj["x-session-token"]) {
                headersObj["x-session-token"] = adminToken;
            }
            if (adminId && !headersObj["x-admin-id"]) {
                headersObj["x-admin-id"] = adminId;
            }
        } else if (isUserContext) {
            // Don't inject stale session headers on login pages
            if (!isLoginPage && localStorage.getItem("isLoggedIn") === "true") {
                if (userToken && !headersObj["x-session-token"]) {
                    headersObj["x-session-token"] = userToken;
                }
                if (userNumber && !headersObj["x-user-number"]) {
                    headersObj["x-user-number"] = userNumber;
                }
            }
        }

        options.headers = headersObj;

        // Determine if this is an authentication request
        let requestUrl = "";
        if (typeof resource === "string") {
            requestUrl = resource;
        } else if (resource && resource.url) {
            requestUrl = resource.url;
        }
        requestUrl = requestUrl.toLowerCase();

        const isAuthRequest = 
            requestUrl.includes("/login") || 
            requestUrl.includes("/newuser") || 
            requestUrl.includes("/send-otp") ||
            requestUrl.includes("/card");

        try {
            const response = await originalFetch(resource, options);

            // If a 401 Unauthorized occurs on a non-auth page/request, trigger logout
            if (response.status === 401 && !isAuthRequest && !isLoginPage) {
                console.warn("Session expired (401). Redirecting to login...");
                if (isOwnerContext) {
                    logoutOwner();
                } else if (isAdminContext) {
                    logoutAdmin();
                } else {
                    logoutUser();
                }
            }
            return response;
        } catch (error) {
            throw error;
        }
    };
})();

// Global PWA Installation Controller
(function () {
    function initGlobalPWA() {
        // Dynamic CSS Injection
        const pwaStyles = `
            .pwa-install-banner {
                position: fixed;
                bottom: 24px;
                left: 24px;
                right: 24px;
                max-width: 400px;
                background: rgba(26, 26, 31, 0.95);
                border: 1px solid rgba(201, 169, 110, 0.3);
                border-radius: 16px;
                padding: 18px;
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                backdrop-filter: blur(12px);
                transform: translateY(150%);
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
            }
            .pwa-install-banner.show {
                transform: translateY(0);
                opacity: 1;
            }
            @media (min-width: 640px) {
                .pwa-install-banner {
                    left: auto;
                    right: 24px;
                }
            }
            .pwa-header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .pwa-icon-wrap {
                width: 48px;
                height: 48px;
                border-radius: 10px;
                overflow: hidden;
                border: 1px solid rgba(201, 169, 110, 0.2);
                background: #0d0d0f;
                flex-shrink: 0;
            }
            .pwa-icon-wrap img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .pwa-title-group {
                display: flex;
                flex-direction: column;
                line-height: 1.2;
            }
            .pwa-title {
                font-weight: 700;
                color: #fff;
                font-size: 1rem;
                font-family: 'Playfair Display', serif;
            }
            .pwa-subtitle {
                font-size: 0.75rem;
                color: #c9a96e;
                font-weight: 500;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }
            .pwa-body-text {
                font-size: 0.82rem;
                color: #a0a0ab;
                line-height: 1.4;
            }
            .pwa-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 4px;
            }
            .pwa-btn-dismiss {
                background: transparent;
                border: 1.5px solid rgba(255, 255, 255, 0.1);
                color: #a0a0ab;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.78rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .pwa-btn-dismiss:hover {
                border-color: rgba(255, 255, 255, 0.25);
                color: #fff;
            }
            .pwa-btn-install {
                background: linear-gradient(135deg, #c9a96e, #a8854e);
                color: #0d0d0f;
                border: none;
                padding: 8px 18px;
                border-radius: 8px;
                font-size: 0.78rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            .pwa-btn-install:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(201, 169, 110, 0.25);
            }

            .ios-install-sheet {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(26, 26, 31, 0.98);
                border-top: 2px solid #c9a96e;
                border-radius: 20px 20px 0 0;
                padding: 24px;
                box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6);
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 16px;
                transform: translateY(100%);
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1);
            }
            .ios-install-sheet.show {
                transform: translateY(0);
            }
            .ios-install-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ios-install-title {
                font-family: 'Playfair Display', serif;
                font-size: 1.2rem;
                color: #fff;
                font-weight: 700;
            }
            .ios-close-btn {
                background: none;
                border: none;
                color: #a0a0ab;
                font-size: 1.5rem;
                cursor: pointer;
                line-height: 1;
            }
            .ios-install-steps {
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            .ios-step {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 0.88rem;
                color: #d1d1d6;
            }
            .ios-step-num {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(201, 169, 110, 0.2);
                border: 1px solid #c9a96e;
                color: #c9a96e;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 0.75rem;
                flex-shrink: 0;
            }
            .ios-icon-svg {
                width: 20px;
                height: 20px;
                fill: none;
                stroke: #c9a96e;
                stroke-width: 2;
                display: inline-block;
                vertical-align: middle;
            }
        `;

        // Inject Stylesheet
        const styleSheet = document.createElement("style");
        styleSheet.textContent = pwaStyles;
        document.head.appendChild(styleSheet);

        // Inject PWA Install Banner HTML
        const bannerHTML = `
            <div id="pwaInstallBanner" class="pwa-install-banner" aria-live="polite" aria-label="Install Web App">
                <div class="pwa-header">
                    <div class="pwa-icon-wrap">
                        <img src="./icon-192.png" alt="SJ Jewellery Logo">
                    </div>
                    <div class="pwa-title-group">
                        <span class="pwa-title">SJ Jewellery</span>
                        <span class="pwa-subtitle">Official App</span>
                    </div>
                </div>
                <div class="pwa-body-text">
                    Add SJ Jewellery to your home screen for quick access to collections, seamless checkout, and offline updates.
                </div>
                <div class="pwa-actions">
                    <button id="pwaBtnDismiss" class="pwa-btn-dismiss">Not Now</button>
                    <button id="pwaBtnInstall" class="pwa-btn-install">Install App</button>
                </div>
            </div>

            <div id="pwaIosSheet" class="ios-install-sheet" role="dialog" aria-modal="true" aria-labelledby="iosInstallTitle">
                <div class="ios-install-header">
                    <span id="iosInstallTitle" class="ios-install-title">Install on iOS Device</span>
                    <button id="iosCloseBtn" class="ios-close-btn" aria-label="Close modal">&times;</button>
                </div>
                <div class="ios-install-steps">
                    <div class="ios-step">
                        <span class="ios-step-num">1</span>
                        <span>Open this site in Safari browser.</span>
                    </div>
                    <div class="ios-step">
                        <span class="ios-step-num">2</span>
                        <span>Tap the <b>Share</b> button <svg class="ios-icon-svg" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13"/></svg> at the bottom of the screen.</span>
                    </div>
                    <div class="ios-step">
                        <span class="ios-step-num">3</span>
                        <span>Scroll down and select <b>Add to Home Screen</b>.</span>
                    </div>
                </div>
            </div>
        `;

        const pwaContainer = document.createElement("div");
        pwaContainer.innerHTML = bannerHTML;
        document.body.appendChild(pwaContainer);

        // Try to inject Install option in header navbar
        const navActions = document.querySelector(".navActions");
        if (navActions) {
            const installBtnHTML = `
                <a href="#" class="navActionBtn" id="navPwaInstallBtn" style="display: none;" aria-label="Install App">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v14M19 9l-7 7-7-7M5 20h14"/>
                    </svg>
                    Install
                </a>
            `;
            const wrapper = document.createElement("div");
            wrapper.innerHTML = installBtnHTML;
            const btnNode = wrapper.firstElementChild;
            
            // Insert it before the Cart button or at the end
            const navCartBtn = document.getElementById("navCartBtn") || navActions.lastElementChild;
            if (navCartBtn) {
                navActions.insertBefore(btnNode, navCartBtn);
            } else {
                navActions.appendChild(btnNode);
            }
        }

        // Logic
        let deferredPrompt;
        const pwaBanner = document.getElementById('pwaInstallBanner');
        const btnInstall = document.getElementById('pwaBtnInstall');
        const btnDismiss = document.getElementById('pwaBtnDismiss');
        const navInstallBtn = document.getElementById('navPwaInstallBtn');
        
        const iosSheet = document.getElementById('pwaIosSheet');
        const iosCloseBtn = document.getElementById('iosCloseBtn');

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        const isDismissed = localStorage.getItem('pwa_dismissed');
        const dismissedTime = localStorage.getItem('pwa_dismissed_time');
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const shouldShowPrompt = !isDismissed || (dismissedTime && (Date.now() - Number(dismissedTime) > oneWeek));

        // 1. Android/Desktop prompt handler
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Show navbar install option
            if (navInstallBtn && !isStandalone) {
                navInstallBtn.style.display = 'flex';
            }

            // Show bottom popup banner
            if (shouldShowPrompt && pwaBanner && !isStandalone) {
                setTimeout(() => {
                    pwaBanner.classList.add('show');
                }, 2000);
            }
        });

        // 2. iOS handler
        if (isIOS && !isStandalone) {
            // iOS doesn't support beforeinstallprompt, show nav install button directly
            if (navInstallBtn) {
                navInstallBtn.style.display = 'flex';
            }
            if (shouldShowPrompt && pwaBanner) {
                setTimeout(() => {
                    pwaBanner.classList.add('show');
                }, 2000);
            }
        }

        // Install Button (Android/Desktop)
        if (btnInstall) {
            btnInstall.addEventListener('click', async () => {
                if (isIOS) {
                    pwaBanner.classList.remove('show');
                    if (iosSheet) iosSheet.classList.add('show');
                    return;
                }
                if (!deferredPrompt) return;
                pwaBanner.classList.remove('show');
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`[PWA] Outcome: ${outcome}`);
                deferredPrompt = null;
                if (navInstallBtn) navInstallBtn.style.display = 'none';
            });
        }

        // Navbar Install Button Click
        if (navInstallBtn) {
            navInstallBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isIOS) {
                    if (iosSheet) iosSheet.classList.add('show');
                    return;
                }
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(({ outcome }) => {
                    console.log(`[PWA] Outcome: ${outcome}`);
                    deferredPrompt = null;
                    navInstallBtn.style.display = 'none';
                    if (pwaBanner) pwaBanner.classList.remove('show');
                });
            });
        }

        // Dismiss Popup Banner
        if (btnDismiss) {
            btnDismiss.addEventListener('click', () => {
                pwaBanner.classList.remove('show');
                localStorage.setItem('pwa_dismissed', 'true');
                localStorage.setItem('pwa_dismissed_time', Date.now().toString());
            });
        }

        // iOS Sheet Close
        if (iosCloseBtn) {
            iosCloseBtn.addEventListener('click', () => {
                iosSheet.classList.remove('show');
            });
        }

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            if (pwaBanner) pwaBanner.classList.remove('show');
            if (navInstallBtn) navInstallBtn.style.display = 'none';
            localStorage.setItem('pwa_installed', 'true');
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGlobalPWA);
    } else {
        initGlobalPWA();
    }
})();
