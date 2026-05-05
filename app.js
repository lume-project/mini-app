const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        function applyTheme() {
            if (tg.colorScheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
        applyTheme();
        tg.onEvent('themeChanged', applyTheme);
        
        // Setup secure fetch wrapper to always pass initData to the backend
        const originalFetch = window.fetch;
        window.fetch = async function() {
            const args = arguments;
            const tgInitData = tg.initData || '';
            
            if (args.length > 1) {
                args[1].headers = {
                    ...args[1].headers,
                    'X-Telegram-Init-Data': tgInitData
                };
            } else {
                args[1] = {
                    headers: {
                        'X-Telegram-Init-Data': tgInitData
                    }
                };
            }
            return originalFetch.apply(this, args);
        };

        // --- MULTILINGUAL LOGIC ---
        function getLang() {
            const code = (tg.initDataUnsafe?.user?.language_code || 'en').toLowerCase();
            if (code.includes('ru')) return 'ru';
            if (code.includes('uk') || code.includes('ua')) return 'uk';
            if (['sr', 'hr', 'bs', 'me'].some(x => code.includes(x))) return 'sr';
            return 'en';
        }
        const lang = getLang();

        function t(key) {
            return translations[lang]?.[key] || translations['en'][key] || key;
        }

        function applyStaticTranslations() {
            document.getElementById('t-welcome').innerText = t('welcome');
            document.getElementById('t-hum').innerText = t('hum');
            document.getElementById('t-wind').innerText = t('wind');
            document.getElementById('t-emergency').innerText = t('emergency');
            document.getElementById('t-management').innerText = t('management');
            document.getElementById('t-support').innerText = t('support');
            document.getElementById('t-create-request').innerText = t('create_request');
            document.getElementById('t-in-progress').innerText = t('in_progress');
            document.getElementById('t-notification').innerText = t('notification');
            document.getElementById('t-debtors-list').innerText = t('debtors_list');
            document.getElementById('engineer-btn').innerText = t('checklist');
            document.getElementById('t-edit-btn').innerText = t('edit');
            document.getElementById('t-apartment-label').innerText = t('apartment');
            document.getElementById('t-to-pay').innerText = t('to_pay');
            document.getElementById('t-total').innerText = t('total');
            document.getElementById('t-maintenance') && (document.getElementById('t-maintenance').innerText = t('maintenance'));
            document.getElementById('t-hot-water') && (document.getElementById('t-hot-water').innerText = t('hot_water'));
            document.getElementById('t-garage') && (document.getElementById('t-garage').innerText = t('garage'));
            document.getElementById('t-close').innerText = t('close');
            document.getElementById('t-home-nav').innerText = t('home_nav');
            document.getElementById('t-tasks-nav').innerText = t('tasks_nav');
            document.getElementById('t-profile-nav').innerText = t('profile_nav');
            
            const status = document.getElementById('status-label');
            status.innerText = t('status_live');
        }

        // --- APP LOGIC ---
        const API_BASE = "https://sinuate-inez-proempire.ngrok-free.dev";
        const ENDPOINTS = {
            data: `${API_BASE}/api/data`,
            update: `${API_BASE}/api/update_contacts`,
            order: `${API_BASE}/api/create_order`,
            broadcast: `${API_BASE}/api/broadcast`,
            remind: `${API_BASE}/api/remind_payment`,
            report: `${API_BASE}/api/send_pdf_report`,
            ordersReport: `${API_BASE}/api/report_orders`,
            adminComplexes: `${API_BASE}/api/admin_complexes`,
            adminComplexUpdate: `${API_BASE}/api/admin_complex_update`,
            adminContacts: `${API_BASE}/api/admin_contacts`,
            adminSaveContact: `${API_BASE}/api/admin_save_contact`,
            adminItems: `${API_BASE}/api/admin_items`,
            adminSaveItem: `${API_BASE}/api/admin_save_item`,
            adminRoles: `${API_BASE}/api/admin_roles`,
            adminSaveRole: `${API_BASE}/api/admin_save_role`
        };
        
        const urlParams = new URLSearchParams(window.location.search);
        const APP_CONFIG = {
            complex_id: urlParams.get('complex_id'),
            user_id: urlParams.get('user_id') || tg.initDataUnsafe?.user?.id
        };

        let cachedData = null;
        function escapeHTML(str) {
            if (!str) return '';
            return String(str).replace(/[&<>'"]/g, tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag));
        }
        let isStaff = false;
        let showingArchive = false;
        let roleLower = "";

        function switchPage(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.id === `nav-${pageId}`));
        }

        async function loadData() {
            applyStaticTranslations();

            if(tg.initDataUnsafe?.user?.photo_url) {
                document.getElementById('profile-avatar').src = tg.initDataUnsafe.user.photo_url;
            }
            document.getElementById('profile-name').innerText = tg.initDataUnsafe?.user?.first_name || 'Resident';

            try {
                const response = await fetch(`${ENDPOINTS.data}?user_id=${APP_CONFIG.user_id}&complex_id=${APP_CONFIG.complex_id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await response.json();
                cachedData = data;
                
                roleLower = (data.role || "").toLowerCase();
                isStaff = ['engineer', 'director', 'administrator', 'staff'].some(r => roleLower.includes(r));

                document.getElementById('complex-display-name').innerText = data.complex_name || "--";
                
                const logoEl = document.getElementById('complex-logo');
                if (data.complex_logo) {
                    logoEl.src = data.complex_logo;
                    logoEl.classList.remove('hidden');
                } else {
                    logoEl.classList.add('hidden');
                }

                if (data.weather) {
                    const rawTemp = String(data.weather.temp || "0").replace(/[^\d.-]/g, ''); 
                    document.getElementById('temp').innerText = `${rawTemp}°C`;
                    document.getElementById('humidity').innerText = data.weather.hum || "--%";
                    document.getElementById('wind').innerText = `${data.weather.wind || "0"} m/s`;
                }
                
                document.getElementById('apt-numbers').innerText = Array.isArray(data.apt) ? data.apt.join(', ') : (data.apt || "--");
                document.getElementById('profile-role').innerText = data.role || "--";

                if (data.finance) {
                    const { finance: f } = data;
                    const cur = f.currency || "€";
                    document.querySelectorAll('.currency-label').forEach(el => el.innerText = cur);
                    document.getElementById('p-total-debt').innerText = f.Total_Debt || "0.00";
                    
                    const detailsContainer = document.getElementById('finance-details');
                    if (detailsContainer) {
                        detailsContainer.innerHTML = '';
                        if (f.services_data) {
                            for (const [key, val] of Object.entries(f.services_data)) {
                                detailsContainer.innerHTML += `
                                    <div class="flex justify-between finance-item theme-text-main">
                                        <span class="text-xs font-medium uppercase">${escapeHTML(key)}</span>
                                        <span class="text-sm font-bold">${escapeHTML(val)} ${cur}</span>
                                    </div>
                                `;
                            }
                        }
                    }
                    
                    document.getElementById('payment-date').innerText = f.last_update || "--";
                }

                const roleAdminBlock = roleLower;
                let showAdminBlock = false;
                
                if (roleAdminBlock.includes('director') || roleAdminBlock.includes('administrator') || roleAdminBlock.includes('engineer')) {
                    showAdminBlock = true;
                    document.getElementById('t-notification')?.classList.remove('hidden');
                    document.getElementById('admin-panel-btn')?.classList.remove('hidden');
                }
                
                if (roleAdminBlock.includes('director') || roleAdminBlock.includes('administrator') || roleAdminBlock.includes('accountant')) {
                    showAdminBlock = true;
                    document.getElementById('t-debtors-list')?.classList.remove('hidden');
                }
                
                if (roleAdminBlock.includes('engineer')) {
                    showAdminBlock = true;
                    document.getElementById('engineer-btn')?.classList.remove('hidden');
                }
                
                if (roleAdminBlock.includes('superadmin')) {
                    showAdminBlock = true;
                    document.getElementById('superadmin-btn')?.classList.remove('hidden');
                }
                
                if (showAdminBlock) {
                    document.getElementById('admin-block')?.classList.remove('hidden');
                }

                if (typeof hideLumeSplash === 'function') hideLumeSplash();

            } catch (err) { 
                console.error("Data loading error:", err);
                const status = document.getElementById('status-label');
                status.innerText = t('status_offline');
                status.classList.replace('text-blue-500/50', 'text-red-500/50');
                if (typeof hideLumeSplash === 'function') hideLumeSplash();
            }
        }

        function toggleArchive() {
            showingArchive = !showingArchive;
            openModal('in-progress');
        }

        async function requestPdfReport() {
            apiRequest(ENDPOINTS.ordersReport, {}, "Отчет формируется...");
        }

        function getTasksHtml() {
            const orders = showingArchive ? cachedData?.archived_orders : cachedData?.active_orders;
            if (!orders?.length) return `<p class="text-[9px] text-slate-600 text-center py-10 uppercase font-black tracking-widest">${t('no_requests')}</p>`;

            const filtered = orders;

            if (!filtered.length) return `<p class="text-[9px] text-slate-600 text-center py-10 uppercase font-black tracking-widest">${t('no_active')}</p>`;

            return filtered.map(o => {
                const sVal = String(o.status || "").toLowerCase();
                const isInProgress = sVal.includes('progress') || sVal.includes('работе');
                const sClass = showingArchive ? 'theme-glass-btn text-slate-600' : (isInProgress ? 'bg-blue-500/10 text-blue-400' : 'theme-glass-btn text-slate-500');
                
                let archiveMeta = '';
                if (showingArchive) {
                    const dateStr = o.updated_at ? new Date(o.updated_at).toLocaleDateString() : '';
                    archiveMeta = `<div class="text-[8px] text-slate-500 mt-2 flex gap-2"><span>Завершено: ${dateStr}</span>${o.executor ? `<span>Кто: ${o.executor}</span>` : ''}</div>`;
                }
                
                return `
                    <div class="flex flex-col p-4 theme-glass-btn rounded-2xl mb-2">
                        <div class="flex justify-between items-start">
                            <div class="flex flex-col flex-1 mr-2">
                                ${(isStaff || showingArchive) ? `<span class="text-[8px] text-slate-500 font-mono mb-1">${t('apartment')}: ${o.apt || '??'}</span>` : ''}
                                <span class="text-[10px] font-bold text-blue-400 uppercase tracking-tight">${o.category || 'Request'}</span>
                                <span class="text-[11px] text-slate-300 line-clamp-2 mt-1">${o.desc || 'No description'}</span>
                            </div>
                            <span class="text-[8px] font-black px-2 py-1 rounded-full ${sClass} uppercase whitespace-nowrap">${o.status}</span>
                        </div>
                        ${archiveMeta}
                    </div>`;
            }).join('');
        }

        async function apiRequest(endpoint, body, successMsg) {
            tg.MainButton.setText(t('processing')).show();
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify({ ...body, user_id: APP_CONFIG.user_id, complex_id: APP_CONFIG.complex_id })
                });

                if (response.ok) {
                    tg.MainButton.setText(successMsg).show();
                    setTimeout(() => { closeModal(); loadData(); }, 1500);
                } else {
                    tg.showAlert("Action failed.");
                    tg.MainButton.hide();
                }
            } catch (err) {
                tg.MainButton.hide();
                tg.showAlert(t('error_conn'));
            }
        }

        const sendOrder = () => {
            const description = document.getElementById('order-desc').value;
            const apartment = document.getElementById('order-apt').value;
            if(!description.trim() || !apartment.trim()) return tg.showAlert(t('error_fields'));
            
            apiRequest(ENDPOINTS.order, {
                category: document.getElementById('order-cat').value,
                description,
                apt: apartment
            }, t('order_sent'));
        };

        const sendBroadcast = () => {
            const message = document.getElementById('broadcast-msg').value;
            if(!message.trim()) return tg.showAlert(t('error_fields'));
            apiRequest(ENDPOINTS.broadcast, { message }, t('success'));
        };

        const sendPaymentReminders = () => {
            const debtors = (cachedData?.all_debtors || []).filter(d => parseFloat(String(d.Total_Debt || "0").replace(',', '.')) > 0);
            if (!debtors.length) return tg.showAlert(t('no_debtors'));
            apiRequest(ENDPOINTS.remind, { debtors }, t('success'));
        };
        
        const sendPdfReport = () => {
            apiRequest(ENDPOINTS.report, {}, t('success'));
        };

        const uploadFinances = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            tg.MainButton.setText("Загрузка файла...").show();
            
            const formData = new FormData();
            formData.append("file", file);
            formData.append("user_id", APP_CONFIG.user_id);
            formData.append("complex_id", APP_CONFIG.complex_id);

            try {
                const response = await fetch(`${API_BASE}/api/upload_finances`, {
                    method: 'POST',
                    headers: { 'X-Telegram-Init-Data': tg.initData || '' },
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    const data = result.data || {};
                    const msg = `Файл успешно загружен.\nСтрок обработано: ${data.total_rows || 0}\nНайдено апартаментов: ${data.found_apts || 0}\nОбновлено должников: ${data.updated || 0}`;
                    tg.showAlert(msg);
                    fetchData(); // reload debtors
                } else {
                    tg.showAlert(result.error || "Ошибка загрузки");
                }
            } catch (err) {
                tg.showAlert("Ошибка: " + err.message);
            } finally {
                tg.MainButton.hide();
                event.target.value = ""; // reset input
            }
        };
        
        function openChecklist() {
            const url = `checklist.html?user_id=${APP_CONFIG.user_id}&complex_id=${APP_CONFIG.complex_id}`;
            window.location.href = url;
        }

        function openModal(type) {
            const body = document.getElementById('modal-body');
            let html = "";

            switch(type) {
                case 'create-order':
                    const servicesHtml = cachedData?.services?.map(s => `<option value="${s}">${s}</option>`).join('') || `<option value="Other">Other</option>`;
                    const currentApt = Array.isArray(cachedData?.apt) ? cachedData.apt[0] : String(cachedData?.apt || "").split(',')[0].trim();
                    html = `
                        <h2 class="text-xl font-bold mb-6 italic text-blue-400">${t('new_request_title')}</h2>
                        <div class="space-y-4">
                            <div><p class="text-[10px] text-slate-500 mb-2 uppercase font-black">${t('category')}</p><select id="order-cat" class="text-sm">${servicesHtml}</select></div>
                            <div><p class="text-[10px] text-slate-500 mb-2 uppercase font-black">${t('object')}</p><input type="text" id="order-apt" class="text-sm" value="${currentApt}"></div>
                            <div><p class="text-[10px] text-slate-500 mb-2 uppercase font-black">${t('description')}</p><textarea id="order-desc" class="text-sm h-32" placeholder="${t('desc_placeholder')}"></textarea></div>
                            <button onclick="sendOrder()" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-4 active:bg-blue-700 transition-colors">${t('send_request')}</button>
                        </div>`;
                    break;
                case 'notifications':
                    html = `
                        <h2 class="text-xl font-bold mb-6 italic text-blue-400">${t('system_notif')}</h2>
                        <textarea id="broadcast-msg" class="text-sm h-40 mb-4" placeholder="${t('notif_placeholder')}"></textarea>
                        <button onclick="sendBroadcast()" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:bg-blue-700 transition-colors">${t('send_all')}</button>`;
                    break;
                case 'payment-reminders':
                    html = `
                        <h2 class="text-xl font-bold mb-6 italic text-blue-400">${t('pay_remind_title')}</h2>
                        <p class="text-[11px] text-slate-300 mb-6">${t('pay_remind_desc')}</p>
                        <div class="p-4 theme-glass-btn rounded-2xl mb-6 italic text-[10px] text-slate-400">"${t('pay_remind_template')}"</div>
                        <button onclick="sendPaymentReminders()" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:bg-blue-700 transition-colors">${t('send_reminders')}</button>`;
                    break;
                case 'pdf-report-confirm':
                    html = `
                        <h2 class="text-xl font-bold mb-6 italic text-blue-400">${t('pdf_title')}</h2>
                        <p class="text-[11px] text-slate-300 mb-6">${t('pdf_desc')}</p>
                        <button onclick="sendPdfReport()" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:bg-blue-700 transition-colors">${t('gen_send')}</button>`;
                    break;
                case 'debtors':
                    html = `<h2 class="text-xl font-bold mb-6 italic text-blue-400">${t('debtors_list')}</h2>`;
                    
                    // Add the "Remind Payment" and "PDF Report" buttons at the top of the modal
                    html += `
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <button onclick="openModal('payment-reminders')" class="w-full py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl font-black uppercase text-[10px] tracking-widest text-blue-400 active:bg-blue-600/40">${t('pay_remind_title') || 'Remind'}</button>
                            <button onclick="openModal('pdf-report-confirm')" class="w-full py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl font-black uppercase text-[10px] tracking-widest text-blue-400 active:bg-blue-600/40">${t('pdf_title') || 'PDF Report'}</button>
                        </div>
                        <input type="file" id="finance-upload" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" class="hidden" onchange="uploadFinances(event)">
                        <button onclick="document.getElementById('finance-upload').click()" class="w-full py-3 mb-6 bg-emerald-600/20 border border-emerald-500/30 rounded-xl font-black uppercase text-[10px] tracking-widest text-emerald-400 active:bg-emerald-600/40">LOAD (CSV/EXCEL)</button>
                        <div class="space-y-2">`;
                        
                    const debtFiltered = (cachedData?.all_debtors || []).filter(d => parseFloat(String(d.Total_Debt || "0").replace(',', '.')) > 0);
                    if (!debtFiltered.length) {
                        html += `<p class="text-center text-slate-500 py-10 uppercase text-[9px] font-black tracking-widest">${t('no_debtors')}</p>`;
                    } else {
                        debtFiltered.forEach(d => {
                            html += `
                            <div class="flex justify-between items-center p-4 theme-glass-btn rounded-2xl">
                                <div class="flex flex-col"><p class="text-[8px] uppercase font-black text-slate-500 mb-1">${t('apartment')}</p><span class="text-sm font-bold text-slate-200">${d.Apartment || d.apt || '--'}</span></div>
                                <div class="text-right"><p class="text-[8px] uppercase font-black text-slate-500 mb-1">${t('total')}</p><span class="text-sm font-black text-red-400">${d.Total_Debt} ${cachedData?.finance?.currency || '€'}</span></div>
                            </div>`;
                        });
                    }
                    html += `</div>`;
                    break;
                case 'in-progress':
                    let headerTitle = showingArchive ? t('archive_btn') : t('in_progress');
                    let btns = `<div class="flex gap-2 mb-6">`;
                    
                    const canSeeArchive = true; // both residents and privileged can see archive, filtered by backend
                    const canSeePdf = roleLower.includes('director') || roleLower.includes('administrator') || roleLower.includes('engineer') || roleLower.includes('accountant');
                    
                    btns += `<button onclick="toggleArchive()" class="flex-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center transition-all ${showingArchive ? 'text-blue-400 border border-blue-400/50' : 'text-slate-300'}">${showingArchive ? t('active_btn') : t('archive_btn')}</button>`;
                    
                    if (canSeePdf) {
                        btns += `<button onclick="requestPdfReport()" class="flex-1 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-blue-400 text-center transition-all border border-blue-500/20">${t('pdf_report')}</button>`;
                    }
                    
                    btns += `</div>`;
                    
                    html = `<h2 class="text-xl font-bold mb-4 italic text-blue-400">${headerTitle}</h2>${btns}<div class="space-y-1">${getTasksHtml()}</div>`;
                    break;
                case 'emergency':
                    html = `<h2 class="text-xl font-bold mb-8 italic text-red-500">${t('emergency')}</h2>`;
                    cachedData?.emergency?.forEach(e => {
                        const cleanPhone = String(e.Phone).replace(/[^\d\+]/g, '');
                        html += `
                            <div class="flex justify-between items-center p-2 bg-red-500/10 border border-red-500/20 rounded-3xl mb-3">
                                <span class="text-red-400 font-bold text-sm ml-2">${e.Name}</span>
                                <button onclick="window.location.href='tel:${cleanPhone}'" class="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase active:bg-red-600">${e.Phone}</button>
                            </div>`;
                    });
                    break;
                case 'uk':
                    html = `<h2 class="text-xl font-bold mb-6 italic text-blue-400">${t('management')}</h2>`;
                    cachedData?.management?.forEach(m => {
                        const val = String(m.Value || "").trim();
                        let onClickAction = '';
                        let btnTxt = '';
                        let btnCol = '';

                        if (val.includes('@') && val.includes('.')) {
                            // Email
                            btnTxt = 'Email';
                            btnCol = 'bg-slate-600';
                            onClickAction = `window.location.href='mailto:${escapeHTML(val)}'`;
                        } else if (val.startsWith('@') || val.toLowerCase().includes('t.me/')) {
                            // Telegram Username / Link
                            const tgUsername = val.replace('@', '').replace('https://t.me/', '').replace('http://t.me/', '').replace('t.me/', '');
                            btnTxt = 'Chat';
                            btnCol = 'bg-[#0088cc]';
                            onClickAction = `tg.openTelegramLink('https://t.me/${tgUsername}')`;
                        } else {
                            // Phone
                            const cleanPhone = val.replace(/[^\d\+]/g, '');
                            btnTxt = 'Call';
                            btnCol = 'bg-green-600';
                            onClickAction = `window.location.href='tel:${cleanPhone}'`;
                        }

                        html += `
                            <div class="p-2 theme-glass-btn rounded-3xl mb-3 flex justify-between items-center">
                                <div class="flex flex-col ml-2"><p class="text-[8px] uppercase font-black text-slate-500">${m.Type}</p><span class="font-bold text-sm theme-text-main">${escapeHTML(val)}</span></div>
                                <button onclick="${onClickAction}" class="${btnCol} text-white text-[9px] font-black px-4 py-2 rounded-xl uppercase active:opacity-50">${btnTxt}</button>
                            </div>`;
                    });
                    break;
                case 'support':
                    html = `
                        <h2 class="text-xl font-bold mb-8 italic text-blue-400">${t('support')}</h2>
                        <button onclick="tg.openLink('https://docs.google.com/document/d/1jg6xLSmwJpXoUuiU0Mf5Cj6mZ4U7YDTWTmbsTpwi4_0/edit?usp=sharing')" class="action-btn-secondary">
                            <span class="btn-label-base text-slate-300">Privacy Policy</span>
                            <span class="text-slate-500">📄</span>
                        </button>`;
                    break;
                case 'edit-profile':
                    html = `
                        <h2 class="text-xl font-bold mb-6 italic">${t('edit_profile')}</h2>
                        <input type="text" id="whatsapp-input" class="mb-3 text-sm" placeholder="WhatsApp" value="${cachedData?.whatsapp || ""}">
                        <input type="email" id="email-input" class="mb-4 text-sm" placeholder="Email" value="${cachedData?.email || ""}">
                        <button onclick="saveProfile()" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:bg-blue-700">${t('save_changes')}</button>`;
                    break;
            }

            body.innerHTML = html || `<p class="text-center text-slate-500 py-10">Empty</p>`;
            document.getElementById('modal-overlay').style.display = 'flex';
        }

        const saveProfile = () => {
            apiRequest(ENDPOINTS.update, {
                whatsapp: document.getElementById('whatsapp-input').value,
                email: document.getElementById('email-input').value
            }, t('success'));
        };

        function closeModal() { 
            document.getElementById('modal-overlay').style.display = 'none'; 
            tg.MainButton.hide();
        }

        // --- SUPERADMIN LOGIC ---
        function openSuperadmin() {
            switchPage('superadmin');
            fetchSuperadminData();
        }

        async function fetchSuperadminData() {
            try {
                const cacheKey = 'complexesData_' + APP_CONFIG.user_id;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const data = JSON.parse(cached);
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                renderSuperAdmin(data.complexes);
                    return;
                }
                const response = await fetch(`${ENDPOINTS.adminComplexes}?user_id=${APP_CONFIG.user_id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                const listEl = document.getElementById('sa-complex-list');
                listEl.innerHTML = '';
                
                if (data.complexes && data.complexes.length > 0) {
                    data.complexes.forEach(c => {
                        const statusColor = String(c.status).toLowerCase() === 'active' ? 'text-green-500' : 'text-red-500';
                        listEl.innerHTML += `
                            <div onclick='openSuperadminEdit(${JSON.stringify(c).replace(/'/g, "&apos;")})' class="glass-card p-4 flex justify-between items-center cursor-pointer active:theme-glass-btn transition-colors">
                                <div class="flex items-center space-x-3">
                                    ${c.logo_url ? `<img src="${c.logo_url}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">🏢</div>`}
                                    <div>
                                        <p class="font-bold text-sm theme-text-main">${c.name || 'Unnamed'}</p>
                                        <p class="text-[9px] text-gray-400 mb-1">${c.city || 'Город не указан'}</p>
                                        <p class="text-[8px] font-black uppercase tracking-wider ${statusColor}">${c.status || 'Inactive'}</p>
                                    </div>
                                </div>
                                <span class="text-slate-500 text-xs">✎</span>
                            </div>
                        `;
                    });
                } else {
                    listEl.innerHTML = '<p class="text-xs text-gray-500 italic">Нет комплексов</p>';
                }
            } catch (err) {
                tg.showAlert("API Error: " + err.message);
            }
        }

        let selectedLogoFile = null;

        let returnPageAfterEdit = 'superadmin';

        function openSuperadminEdit(complex, source = 'superadmin') {
            returnPageAfterEdit = source;
            switchPage('superadmin-edit');
            const title = document.getElementById('sa-edit-title');
            const backBtn = document.getElementById('sa-edit-back-btn');
            
            if (backBtn) {
                backBtn.innerText = source === 'tasks' ? "< НАЗАД К ЗАДАЧАМ" : "< НАЗАД К СПИСКУ";
            }
            
            selectedLogoFile = null;
            document.getElementById('sa-edit-logo-input').value = "";
            const preview = document.getElementById('sa-edit-logo-preview');
            const rolesBtn = document.getElementById('sa-edit-roles-btn');
            const contactsBtn = document.getElementById('sa-edit-contacts-btn');
            const servicesBtn = document.getElementById('sa-edit-services-btn');
            const checklistsBtn = document.getElementById('sa-edit-checklists-btn');
            
            const saStatusCard = document.getElementById('sa-edit-status').closest('.glass-card');
            const saNameCard = document.getElementById('sa-edit-name').parentElement;
            const saCityCard = document.getElementById('sa-edit-city').parentElement;
            const saLogoCard = document.getElementById('sa-edit-logo-input').closest('.glass-card');
            const saveBtn = document.querySelector('button[onclick="saveSuperadminComplex()"]');

            const roleLower = document.getElementById('profile-role').innerText.toLowerCase();

            // Reset visibility to defaults (for superadmin)
            saStatusCard.style.display = roleLower.includes('superadmin') ? 'flex' : 'none';
            saNameCard.style.display = 'block';
            saCityCard.style.display = 'block';
            saLogoCard.style.display = 'block';
            saveBtn.style.display = 'block';
            rolesBtn.style.display = 'block';
            contactsBtn.style.display = 'block';
            servicesBtn.style.display = 'block';
            checklistsBtn.style.display = 'block';

            const isEngineer = roleLower.includes('engineer');
            const isAdmin = roleLower.includes('director') || roleLower.includes('administrator');
            
            // Role-based restrictions logic when opening from 'tasks' page
            if (source === 'tasks') {
                if (isEngineer && !isAdmin) {
                    // Engineers ONLY can ONLY edit checklists
                    saStatusCard.style.display = 'none';
                    saNameCard.style.display = 'none';
                    saCityCard.style.display = 'none';
                    saLogoCard.style.display = 'none';
                    saveBtn.style.display = 'none';
                    rolesBtn.style.display = 'none';
                    contactsBtn.style.display = 'none';
                    servicesBtn.style.display = 'none';
                    checklistsBtn.style.display = 'block';
                } else if (isAdmin && !isEngineer) {
                    // Director/Admin ONLY can edit anything EXCEPT checklists
                    checklistsBtn.style.display = 'none';
                }
                // If both, nothing is blocked!
            }
            
            const inviteBlock = document.getElementById('sa-invite-block');
            const inviteInput = document.getElementById('sa-invite-link');
            
            if (complex) {
                title.innerText = "Редактирование: " + complex.name;
                document.getElementById('sa-edit-id').value = complex.id;
                document.getElementById('sa-edit-name').value = complex.name || "";
                document.getElementById('sa-edit-city').value = complex.city || "";
                document.getElementById('sa-edit-status').checked = (String(complex.status).toLowerCase() === 'active');
                
                if (inviteBlock && inviteInput) {
                    if (complex.invite_link) {
                        inviteInput.value = complex.invite_link;
                        inviteBlock.style.display = 'flex';
                    } else {
                        inviteBlock.style.display = 'none';
                    }
                }
                
                if (source === 'tasks') {
                    rolesBtn.style.display = (isEngineer && !isAdmin) ? 'none' : 'block';
                    contactsBtn.style.display = (isEngineer && !isAdmin) ? 'none' : 'block';
                    servicesBtn.style.display = (isEngineer && !isAdmin) ? 'none' : 'block';
                    checklistsBtn.style.display = (isAdmin && !isEngineer) ? 'none' : 'block';
                } else {
                    rolesBtn.style.display = 'block';
                    contactsBtn.style.display = 'block';
                    servicesBtn.style.display = 'block';
                    checklistsBtn.style.display = 'block';
                }
                
                if (complex.logo_url) {
                    preview.src = complex.logo_url;
                    preview.classList.remove('hidden');
                } else {
                    preview.classList.add('hidden');
                }
            } else {
                title.innerText = "Новый комплекс";
                document.getElementById('sa-edit-id').value = "";
                document.getElementById('sa-edit-name').value = "";
                document.getElementById('sa-edit-city').value = "";
                document.getElementById('sa-edit-status').checked = true;
                if (inviteBlock) inviteBlock.style.display = 'none';
                rolesBtn.style.display = 'none';
                contactsBtn.style.display = 'none';
                servicesBtn.style.display = 'none';
                checklistsBtn.style.display = 'none';
                preview.classList.add('hidden');
            }

            document.getElementById('sa-edit-logo-input').onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    selectedLogoFile = e.target.files[0];
                    preview.src = URL.createObjectURL(selectedLogoFile);
                    preview.classList.remove('hidden');
                }
            };
        }

        function closeSuperadminEdit() {
            switchPage(returnPageAfterEdit);
            fetchSuperadminData();
        }

        async function openAdminPanel() {
            tg.MainButton.hide();
            // Fetch the complex by ID from admin API
            try {
                const title = document.getElementById('sa-edit-title');
                title.innerText = "Загрузка...";
                switchPage('superadmin-edit'); // temporarily show it empty/loading
                
                const cacheKey = 'complexesData_' + APP_CONFIG.user_id;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const data = JSON.parse(cached);
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                renderSuperAdmin(data.complexes);
                    return;
                }
                const response = await fetch(`${ENDPOINTS.adminComplexes}?user_id=${APP_CONFIG.user_id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await response.json();
                
                if (data.complexes) {
                    const currentComplex = data.complexes.find(c => String(c.id) === String(APP_CONFIG.complex_id));
                    if (currentComplex) {
                        openSuperadminEdit(currentComplex, 'tasks');
                    } else {
                        tg.showAlert("Complex access error");
                        switchPage('tasks');
                    }
                }
            } catch(e) {
                tg.showAlert("API Error");
                switchPage('tasks');
            }
        }

        async function saveSuperadminComplex() {
            const btn = tg.MainButton;
            btn.setText("СОХРАНЕНИЕ...").show();
            
            try {
                const formData = new FormData();
                formData.append('user_id', APP_CONFIG.user_id);
                formData.append('id', document.getElementById('sa-edit-id').value);
                formData.append('name', document.getElementById('sa-edit-name').value);
                formData.append('city', document.getElementById('sa-edit-city').value);
                formData.append('is_active', document.getElementById('sa-edit-status').checked ? 'true' : 'false');
                
                if (selectedLogoFile) {
                    formData.append('logo', selectedLogoFile);
                }

                const response = await fetch(ENDPOINTS.adminComplexUpdate, {
                    method: 'POST',
                    headers: { 'ngrok-skip-browser-warning': 'true' },
                    body: formData
                });
                
                const data = await response.json();
                if (!response.ok || data.error) throw new Error(data.error || "Save error");
                
                btn.setText("УСПЕШНО").setParams({ color: "#22c55e" });
                setTimeout(() => {
                    btn.hide();
                    if (returnPageAfterEdit === 'tasks') {
                        switchPage('tasks');
                    } else {
                        openSuperadmin(); // reload list
                    }
                }, 1000);
            } catch (err) {
                tg.showAlert("Ошибка: " + err.message);
                btn.hide();
            }
        }
        
        async function openAdminContacts() {
            const comp_id = document.getElementById('sa-edit-id').value;
            if (!comp_id) {
                tg.showAlert("Сначала сохраните новый ЖК!");
                return;
            }
            
            const body = document.getElementById('modal-body');
            body.innerHTML = `<p class="text-center text-slate-500 py-10 uppercase text-[9px] font-black tracking-widest">Загрузка...</p>`;
            document.getElementById('modal-overlay').style.display = 'flex';
            
            await fetchAdminContacts(comp_id);
        }

        async function fetchAdminContacts(comp_id) {
            try {
                const response = await fetch(`${ENDPOINTS.adminContacts}?user_id=${APP_CONFIG.user_id}&complex_id=${comp_id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                let html = `<h2 class="text-xl font-bold mb-6 italic text-blue-400">Контакты (Экстренные/УК)</h2>
                            <div class="space-y-3 mb-6" id="admin-contacts-list">`;
                
                if (data.contacts && data.contacts.length > 0) {
                    data.contacts.forEach(c => {
                        html += `
                            <div class="p-3 theme-glass-btn rounded-2xl flex justify-between items-center">
                                <div>
                                    <p class="text-[10px] font-black uppercase text-slate-500">${c.is_emergency ? 'Экстренный 🚨' : 'Управление 🏢'}</p>
                                    <p class="theme-text-main text-sm font-bold">${c.name || c.name_or_type || 'N/A'}</p>
                                    <p class="text-slate-400 text-xs">${c.value || c.contact_value || 'N/A'}</p>
                                </div>
                                <button onclick="deleteAdminContact('${escapeHTML(c.id)}', '${comp_id}')" class="bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-3 py-2 rounded-xl active:bg-red-500/40">Del</button>
                            </div>
                        `;
                    });
                } else {
                    html += `<p class="text-center text-slate-500 py-6 text-xs italic">Нет контактов</p>`;
                }
                
                html += `</div>
                
                <h3 class="text-sm font-bold mb-3 italic text-blue-400">Добавить новый</h3>
                <div class="space-y-3">
                    <input type="text" id="add-contact-name" class="text-sm" placeholder="Название (например: Электрик)">
                    <input type="text" id="add-contact-value" class="text-sm" placeholder="Номер или @юзернейм">
                    <label class="flex items-center space-x-2 text-sm text-slate-300 font-bold ml-1 pt-1">
                        <input type="checkbox" id="add-contact-emergency" class="w-4 h-4 rounded appearance-none border border-white/20 checked:bg-red-500 checked:border-red-500"> 
                        <span>Экстренный вызов? 🚨</span>
                    </label>
                    <button onclick="saveAdminContact('${comp_id}')" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-2 active:bg-blue-700">ДОБАВИТЬ</button>
                </div>`;
                
                document.getElementById('modal-body').innerHTML = html;
            } catch (err) {
                document.getElementById('modal-body').innerHTML = `<p class="text-red-500 text-center py-10">${err.message}</p>`;
            }
        }
        
        async function saveAdminContact(comp_id) {
            const name = document.getElementById('add-contact-name').value;
            const value = document.getElementById('add-contact-value').value;
            const is_emergency = document.getElementById('add-contact-emergency').checked;
            
            if (!name.trim() || !value.trim()) {
                tg.showAlert("Заполните название и номер!");
                return;
            }
            
            tg.MainButton.setText("СОХРАНЕНИЕ...").show();
            try {
                const response = await fetch(ENDPOINTS.adminSaveContact, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify({
                        user_id: APP_CONFIG.user_id,
                        action: 'add',
                        complex_id: comp_id,
                        name: name,
                        value: value,
                        is_emergency: is_emergency
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                tg.MainButton.hide();
                fetchAdminContacts(comp_id); // reload modal content
            } catch (err) {
                tg.MainButton.hide();
                tg.showAlert("Ошибка: " + err.message);
            }
        }
        
        async function deleteAdminContact(contact_id, comp_id) {
            // Using standard confirm may block execution in TG Web Apps depending on platform, better to avoid if possible, but let's see. 
            // Better to use tg.showConfirm
            tg.showConfirm("Удалить контакт?", async (confirmed) => {
                if (confirmed) {
                    tg.MainButton.setText("УДАЛЕНИЕ...").show();
                    try {
                        const response = await fetch(ENDPOINTS.adminSaveContact, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({
                                user_id: APP_CONFIG.user_id,
                                action: 'delete',
                                id: contact_id
                            })
                        });
                        const data = await response.json();
                        if (data.error) throw new Error(data.error);
                        
                        tg.MainButton.hide();
                        fetchAdminContacts(comp_id); // reload modal content
                    } catch (err) {
                        tg.MainButton.hide();
                        tg.showAlert("Ошибка: " + err.message);
                    }
                }
            });
        }
        async function openAdminItems(type) {
            const comp_id = document.getElementById('sa-edit-id').value;
            if (!comp_id) {
                tg.showAlert("Сначала сохраните новый ЖК!");
                return;
            }
            
            const body = document.getElementById('modal-body');
            body.innerHTML = `<p class="text-center text-slate-500 py-10 uppercase text-[9px] font-black tracking-widest">Загрузка...</p>`;
            document.getElementById('modal-overlay').style.display = 'flex';
            
            await fetchAdminItems(comp_id, type);
        }

        async function fetchAdminItems(comp_id, type) {
            try {
                const cacheKeyItems = 'adminItems_' + comp_id + '_' + type;
                const cachedItems = sessionStorage.getItem(cacheKeyItems);
                if (cachedItems) {
                    const data = JSON.parse(cachedItems);
                    sessionStorage.setItem('adminItems_' + comp_id + '_' + type, JSON.stringify(data));
                renderAdminItems(data.items, comp_id, type);
                    return;
                }
                const response = await fetch(`${ENDPOINTS.adminItems}?user_id=${APP_CONFIG.user_id}&complex_id=${comp_id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                const isServices = type === 'services';
                const isChecklists = type === 'checklists';
                const isFinances = type === 'finances';
                
                let title = isServices ? "Перечень услуг (жильцам)" : "Списки чеклиста (охране)";
                if (isFinances) title = "Финансовые категории";
                
                const addPlaceholder = isServices ? "Название (например: Клининг)" : isFinances ? "Категория (например: Паркинг)" : "Название зоны (например: Бассейн)";
                const addDescPlaceholder = isFinances ? "Ключевые слова через запятую (например: garaž, garah)" : "Описание (необязательно, например: 15 EUR/час)";
                
                let filteredItems = [];
                if (data.items) {
                    if (isServices) {
                        filteredItems = data.items.filter(i => i.name && (!i.is_finance || i.is_finance === "false" || i.is_finance === "FALSE" || i.is_finance === 0) && String(i.name).trim() !== '' && String(i.name).toUpperCase() !== 'NULL' && String(i.name) !== 'Зона не указана');
                    } else if (isChecklists) {
                        filteredItems = data.items.filter(i => i.area_object && String(i.area_object).trim() !== '' && String(i.area_object).toUpperCase() !== 'NULL' && String(i.area_object) !== 'Зона не указана');
                    } else if (isFinances) {
                        filteredItems = data.items.filter(i => i.is_finance && String(i.is_finance).trim() !== '' && String(i.is_finance).toUpperCase() !== 'NULL' && String(i.is_finance) !== 'false' && String(i.is_finance) !== 'FALSE');
                    }
                }
                
                let html = `<h2 class="text-xl font-bold mb-6 italic text-blue-400">${title}</h2>
                            <div class="space-y-3 mb-6" id="admin-items-list">`;
                
                if (filteredItems.length > 0) {
                    filteredItems.forEach(i => {
                        const displayName = isFinances ? i.is_finance : (isServices ? i.name : i.area_object);
                        let desc = isServices && i.description ? `<p class="text-slate-400 text-xs mt-1">${i.description}</p>` : '';
                        if (isFinances && i.keywords) {
                            desc = `<p class="text-slate-400 text-xs mt-1 italic">Ключевые слова: ${i.keywords}</p>`;
                        }
                        
                        html += `
                            <div class="p-3 theme-glass-btn rounded-2xl flex justify-between items-center">
                                <div>
                                    <p class="theme-text-main text-sm font-bold">${displayName}</p>
                                    ${desc}
                                </div>
                                <button onclick="deleteAdminItem('${i.id}', '${comp_id}', '${type}')" class="bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-3 py-2 rounded-xl active:bg-red-500/40 shrink-0 ml-2">Del</button>
                            </div>
                        `;
                    });
                } else {
                    html += `<p class="text-center text-slate-500 py-6 text-xs italic">Список пуст</p>`;
                }
                
                html += `</div>
                
                <h3 class="text-sm font-bold mb-3 italic text-blue-400">Добавить</h3>
                <div class="space-y-3">
                    <input type="text" id="add-item-name" class="text-sm" placeholder="${addPlaceholder}">
                    ${(isServices || isFinances) ? `<input type="text" id="add-item-desc" class="text-sm" placeholder="${addDescPlaceholder}">` : ''}
                    <button onclick="saveAdminItem('${comp_id}', '${type}')" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-2 active:bg-blue-700">ДОБАВИТЬ</button>
                </div>`;
                
                document.getElementById('modal-body').innerHTML = html;
            } catch (err) {
                document.getElementById('modal-body').innerHTML = `<p class="text-red-500 text-center py-10">${err.message}</p>`;
            }
        }
        
        async function saveAdminItem(comp_id, type) {
            const isServices = type === 'services';
            const isFinances = type === 'finances';
            const isChecklists = type === 'checklists';
            const nameField = document.getElementById('add-item-name').value;
            const descField = (isServices || isFinances) ? document.getElementById('add-item-desc').value : '';
            
            if (!nameField.trim()) {
                tg.showAlert("Заполните название!");
                return;
            }
            
            const payload = {
                user_id: APP_CONFIG.user_id,
                action: 'add',
                complex_id: comp_id,
                name: isServices ? nameField : null,
                area_object: isChecklists ? nameField : null,
                description: isServices ? descField : null,
                is_finance: isFinances ? nameField : null,
                keywords: isFinances ? descField : null
            };
            
            tg.MainButton.setText("СОХРАНЕНИЕ...").show();
            try {
                const response = await fetch(ENDPOINTS.adminSaveItem, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                tg.MainButton.hide();
                fetchAdminItems(comp_id, type); // reload list inline
            } catch (err) {
                tg.MainButton.hide();
                tg.showAlert("Ошибка: " + err.message);
            }
        }
        
        async function deleteAdminItem(item_id, comp_id, type) {
            tg.showConfirm("Удалить этот пункт?", async (confirmed) => {
                if (confirmed) {
                    tg.MainButton.setText("УДАЛЕНИЕ...").show();
                    try {
                        const response = await fetch(ENDPOINTS.adminSaveItem, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({
                                user_id: APP_CONFIG.user_id,
                                action: 'delete',
                                id: item_id
                            })
                        });
                        const data = await response.json();
                        if (data.error) throw new Error(data.error);
                        
                        tg.MainButton.hide();
                        fetchAdminItems(comp_id, type);
                    } catch (err) {
                        tg.MainButton.hide();
                        tg.showAlert("Ошибка: " + err.message);
                    }
                }
            });
        }
        async function openAdminRoles() {
            const comp_id = document.getElementById('sa-edit-id').value;
            if (!comp_id) {
                tg.showAlert("Сначала сохраните новый ЖК!");
                return;
            }
            
            const body = document.getElementById('modal-body');
            body.innerHTML = `<p class="text-center text-slate-500 py-10 uppercase text-[9px] font-black tracking-widest">Загрузка...</p>`;
            document.getElementById('modal-overlay').style.display = 'flex';
            
            await fetchAdminRoles(comp_id);
        }

        async function fetchAdminRoles(comp_id) {
            try {
                const response = await fetch(`${ENDPOINTS.adminRoles}?user_id=${APP_CONFIG.user_id}&complex_id=${comp_id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                let html = `<h2 class="text-xl font-bold mb-6 italic text-blue-400">Назначение ролей</h2>
                            <div class="space-y-3 mb-6" id="admin-roles-list">`;
                
                if (data.roles && data.roles.length > 0) {
                    data.roles.forEach(r => {
                        const displayName = r.full_name || r.username || `User ${r.id}`;
                        const displayApt = r.apt ? ` (Апт: ${r.apt})` : '';
                        html += `
                            <div class="p-3 theme-glass-btn rounded-2xl flex justify-between items-center">
                                <div>
                                    <p class="theme-text-main text-sm font-bold flex items-center gap-1">${displayName} <span class="text-xs text-slate-500">${displayApt}</span></p>
                                    <p class="text-[10px] uppercase font-black text-slate-400 mt-1">@${r.username || 'unknown'} • Роль: <span class="text-blue-400">${r.role || 'user'}</span></p>
                                </div>
                                <button onclick="deleteAdminRole('${r.id}', '${comp_id}')" class="bg-red-500/20 text-red-500 text-[10px] font-black uppercase px-3 py-2 rounded-xl active:bg-red-500/40 shrink-0 ml-2">Отвязать</button>
                            </div>
                        `;
                    });
                } else {
                    html += `<p class="text-center text-slate-500 py-6 text-xs italic">Список пуст</p>`;
                }
                
                html += `</div>
                
                <h3 class="text-sm font-bold mb-3 italic text-blue-400">Добавить / Изменить роль</h3>
                <div class="space-y-3">
                    <input type="text" id="add-role-username" class="text-sm bg-black/20 border border-white/10 p-3 rounded-xl w-full" placeholder="Username (без @) или ID">
                    <select id="add-role-select" class="text-sm border border-white/10 p-3 rounded-xl w-full focus:outline-none focus:border-blue-500">
                        <option value="resident">Resident / Жилец</option>
                        <option value="master">Master / Мастер</option>
                        <option value="administrator">Administrator / Администратор</option>
                        <option value="accountant">Accountant / Бухгалтер</option>
                        <option value="engineer">Engineer / Инженер</option>
                        <option value="director">Director / Директор</option>
                    </select>
                    <button onclick="saveAdminRole('${comp_id}')" class="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-2 active:bg-blue-700">СОХРАНИТЬ</button>
                    <p class="text-[9px] text-slate-500 text-center leading-tight mt-2">Если пользователя нет в базе (он еще не заходил в бота), будет создана пустая запись, которая привяжется к нему, когда он зайдет с этим username.</p>
                </div>`;
                
                document.getElementById('modal-body').innerHTML = html;
            } catch (err) {
                document.getElementById('modal-body').innerHTML = `<p class="text-red-500 text-center py-10">${err.message}</p>`;
            }
        }
        
        async function saveAdminRole(comp_id) {
            const username = document.getElementById('add-role-username').value;
            const role = document.getElementById('add-role-select').value;
            
            if (!username.trim()) {
                tg.showAlert("Введите Username!");
                return;
            }
            
            const payload = {
                user_id: APP_CONFIG.user_id,
                action: 'add',
                complex_id: comp_id,
                username: username,
                role: role
            };
            
            tg.MainButton.setText("СОХРАНЕНИЕ...").show();
            try {
                const response = await fetch(ENDPOINTS.adminSaveRole, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                tg.MainButton.hide();
                fetchAdminRoles(comp_id); // reload list inline
            } catch (err) {
                tg.MainButton.hide();
                tg.showAlert("Ошибка: " + err.message);
            }
        }
        
        async function deleteAdminRole(target_id, comp_id) {
            tg.showConfirm("Отвязать пользователя от этого ЖК? (его роль сбросится)", async (confirmed) => {
                if (confirmed) {
                    tg.MainButton.setText("ОБРАБОТКА...").show();
                    try {
                        const response = await fetch(ENDPOINTS.adminSaveRole, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({
                                user_id: APP_CONFIG.user_id,
                                action: 'delete',
                                id: target_id
                            })
                        });
                        const data = await response.json();
                        if (data.error) throw new Error(data.error);
                        
                        tg.MainButton.hide();
                        fetchAdminRoles(comp_id);
                    } catch (err) {
                        tg.MainButton.hide();
                        tg.showAlert("Ошибка: " + err.message);
                    }
                }
            });
        }
        // --- END SUPERADMIN LOGIC ---

        loadData();
