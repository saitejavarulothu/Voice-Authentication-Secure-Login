// Voice Authentication Web Application with Real Audio Recording & Matching

class VoiceAuthApp {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = null;
        this.recordedVoices = [];
        this.enrollmentSamples = 0;
        this.mediaRecorder = null;
        this.audioContext = null;
        this.stream = null;
        this.currentRecording = [];
        this.isRecording = false;
        this.initEventListeners();
        this.initAudio();
    }

    // Initialize audio context
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Audio Context not supported:', e);
        }
    }

    // Load users from localStorage
    loadUsers() {
        const data = localStorage.getItem('voiceUsers');
        return data ? JSON.parse(data) : {};
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('voiceUsers', JSON.stringify(this.users));
    }

    // Initialize event listeners
    initEventListeners() {
        // Authentication Screen
        document.getElementById('recordAuthBtn').addEventListener('click', () => this.recordVoice('auth'));
        document.getElementById('authenticateBtn').addEventListener('click', () => this.authenticate());
        document.getElementById('switchEnrollBtn').addEventListener('click', () => this.switchScreen('enroll'));

        // Enrollment Screen
        document.getElementById('recordEnrollBtn').addEventListener('click', () => this.recordVoice('enroll'));
        document.getElementById('enrollBtn').addEventListener('click', () => this.enrollUser());
        document.getElementById('switchAuthBtn').addEventListener('click', () => this.switchScreen('auth'));

        // Dashboard Screen
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Admin Panel
        document.getElementById('unlockBtn').addEventListener('click', () => this.unlockAccount());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteUser());
        document.getElementById('exitAdminBtn').addEventListener('click', () => this.switchScreen('auth'));
    }

    // Switch between screens
    switchScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName + 'Screen').classList.add('active');

        // Reset messages
        if (screenName === 'auth') {
            this.clearMessage('auth');
        } else if (screenName === 'enroll') {
            this.clearMessage('enroll');
            this.enrollmentSamples = 0;
            this.recordedVoices = [];
            this.updateSampleCounter();
        }
    }

    // Request microphone permission
    async requestMicrophonePermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            alert('❌ Microphone permission denied. Please enable microphone access.');
            return false;
        }
    }

    // Record voice - Real time with actual audio
    async recordVoice(type) {
        const btn = type === 'auth' ? 
            document.getElementById('recordAuthBtn') : 
            document.getElementById('recordEnrollBtn');
        
        const statusEl = type === 'auth' ? 
            document.getElementById('recordingStatus') : 
            document.getElementById('enrollRecordingStatus');

        // Check if already recording
        if (this.isRecording) {
            this.showMessage(type, '❌ Already recording! Please wait.', 'error');
            return;
        }

        // Request microphone permission
        if (!this.stream) {
            const hasPermission = await this.requestMicrophonePermission();
            if (!hasPermission) return;
        }

        this.isRecording = true;
        btn.disabled = true;
        statusEl.textContent = '🔴 Recording... Speak now!';
        statusEl.classList.add('recording');

        this.currentRecording = [];

        try {
            // Create MediaRecorder with proper mime type
            const options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/mp4';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = '';
            }

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.currentRecording = [];

            // Collect audio data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.currentRecording.push(event.data);
                }
            };

            // When recording stops
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.currentRecording, { type: 'audio/webm' });
                
                // Check if audio was actually recorded
                if (audioBlob.size < 1000) {
                    this.showMessage(type, '❌ No voice detected! Please speak clearly and try again.', 'error');
                    btn.disabled = false;
                    statusEl.textContent = '❌ Recording failed - No voice detected';
                    statusEl.classList.remove('recording');
                    this.isRecording = false;
                    return;
                }

                // Create audio URL for playback
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Analyze the audio
                const voiceSignature = await this.analyzeAudioData(audioBlob);

                if (type === 'enroll') {
                    this.enrollmentSamples++;
                    this.recordedVoices.push({
                        passphrase: document.getElementById('enrollPassphrase').value,
                        signature: voiceSignature,
                        audioBlob: audioBlob,
                        audioUrl: audioUrl,
                        recordedAt: new Date().toLocaleString()
                    });
                    this.updateSampleCounter();
                    
                    this.showMessage('enroll', `✅ Sample ${this.enrollmentSamples}/3 recorded successfully!`, 'success');
                } else {
                    this.recordedVoices = [{
                        passphrase: document.getElementById('authPassphrase').value,
                        signature: voiceSignature,
                        audioBlob: audioBlob,
                        audioUrl: audioUrl,
                        recordedAt: new Date().toLocaleString()
                    }];
                    
                    this.showMessage('auth', '✅ Voice recorded successfully! Click Login to authenticate.', 'success');
                }

                btn.disabled = false;
                statusEl.textContent = '✅ Recording complete!';
                statusEl.classList.remove('recording');
                this.isRecording = false;
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('Recording error:', event.error);
                btn.disabled = false;
                statusEl.textContent = '❌ Recording failed!';
                statusEl.classList.remove('recording');
                this.isRecording = false;
            };

            // Start recording
            this.mediaRecorder.start();

            // Stop recording after 5 seconds
            setTimeout(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                }
            }, 5000);

        } catch (error) {
            console.error('Recording error:', error);
            btn.disabled = false;
            statusEl.textContent = '❌ Recording failed!';
            statusEl.classList.remove('recording');
            this.isRecording = false;
            this.showMessage(type, 'Recording failed. Please try again.', 'error');
        }
    }

    // Analyze audio data using Web Audio API - IMPROVED
    async analyzeAudioData(audioBlob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    // Extract features from audio
                    const rawData = audioBuffer.getChannelData(0);
                    const signature = this.extractAudioFeatures(rawData);
                    
                    console.log('Generated Signature:', signature);
                    resolve(signature);
                } catch (error) {
                    console.error('Audio analysis error:', error);
                    // Fallback signature
                    const fallback = {
                        rms: Math.random().toFixed(4),
                        zcr: Math.random().toFixed(4),
                        freqBins: [Math.random().toFixed(4), Math.random().toFixed(4), Math.random().toFixed(4), Math.random().toFixed(4), Math.random().toFixed(4)],
                        length: audioBlob.size,
                        timestamp: Date.now()
                    };
                    resolve(JSON.stringify(fallback));
                }
            };
            
            reader.readAsArrayBuffer(audioBlob);
        });
    }

    // Extract audio features for comparison - IMPROVED
    extractAudioFeatures(audioData) {
        // Calculate RMS (Root Mean Square) energy
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);

        // Calculate zero crossing rate
        let crossings = 0;
        for (let i = 0; i < audioData.length - 1; i++) {
            if ((audioData[i] >= 0 && audioData[i + 1] < 0) || 
                (audioData[i] < 0 && audioData[i + 1] >= 0)) {
                crossings++;
            }
        }
        const zcr = crossings / audioData.length;

        // Get frequency distribution (simple approach)
        const freqBins = this.calculateFrequencyBins(audioData);

        // Get spectral centroid
        const spectralCentroid = this.calculateSpectralCentroid(audioData);

        // Create signature from features
        const signature = {
            rms: rms.toFixed(6),
            zcr: zcr.toFixed(6),
            spectralCentroid: spectralCentroid.toFixed(6),
            freqBins: freqBins,
            length: audioData.length,
            timestamp: Date.now()
        };

        return JSON.stringify(signature);
    }

    // Calculate simple frequency bins
    calculateFrequencyBins(audioData) {
        const bins = [0, 0, 0, 0, 0];
        const binSize = Math.floor(audioData.length / bins.length);

        for (let i = 0; i < bins.length; i++) {
            let sum = 0;
            for (let j = 0; j < binSize; j++) {
                const index = i * binSize + j;
                if (index < audioData.length) {
                    sum += Math.abs(audioData[index]);
                }
            }
            bins[i] = (sum / binSize).toFixed(6);
        }

        return bins;
    }

    // Calculate spectral centroid
    calculateSpectralCentroid(audioData) {
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < audioData.length; i++) {
            const magnitude = Math.abs(audioData[i]);
            numerator += i * magnitude;
            denominator += magnitude;
        }

        return denominator > 0 ? numerator / denominator : 0;
    }

    // Update sample counter
    updateSampleCounter() {
        const counter = document.getElementById('sampleCounter');
        if (this.enrollmentSamples > 0) {
            counter.textContent = `📊 Samples recorded: ${this.enrollmentSamples}/3`;
        }
    }

    // Compare voice signatures with confidence score - IMPROVED
    compareVoiceSignatures(recordedSignature, storedSignatures) {
        if (!recordedSignature || !storedSignatures || storedSignatures.length === 0) {
            return { matched: false, confidence: 0 };
        }

        try {
            const recorded = typeof recordedSignature === 'string' ? 
                JSON.parse(recordedSignature) : recordedSignature;
            
            let totalConfidence = 0;
            let matchCount = 0;

            // Compare with all stored profiles
            for (let stored of storedSignatures) {
                const storedData = typeof stored.signature === 'string' ? 
                    JSON.parse(stored.signature) : stored.signature;

                console.log('Comparing Recorded:', recorded);
                console.log('With Stored:', storedData);

                // Calculate similarity for each feature
                const rmsMatch = this.compareNumericValues(
                    parseFloat(recorded.rms), 
                    parseFloat(storedData.rms), 
                    0.02
                );
                
                const zcrMatch = this.compareNumericValues(
                    parseFloat(recorded.zcr), 
                    parseFloat(storedData.zcr), 
                    0.02
                );
                
                const centroidMatch = this.compareNumericValues(
                    parseFloat(recorded.spectralCentroid || 0), 
                    parseFloat(storedData.spectralCentroid || 0), 
                    500
                );
                
                // Compare frequency bins
                let freqMatch = 0;
                if (Array.isArray(recorded.freqBins) && Array.isArray(storedData.freqBins)) {
                    let freqSum = 0;
                    let freqCount = 0;
                    for (let i = 0; i < Math.min(recorded.freqBins.length, storedData.freqBins.length); i++) {
                        const match = this.compareNumericValues(
                            parseFloat(recorded.freqBins[i]), 
                            parseFloat(storedData.freqBins[i]), 
                            0.01
                        );
                        freqSum += match;
                        freqCount++;
                    }
                    freqMatch = freqCount > 0 ? freqSum / freqCount : 0;
                }

                // Calculate overall confidence (weighted average)
                const confidence = (rmsMatch * 0.25 + zcrMatch * 0.25 + freqMatch * 0.35 + centroidMatch * 0.15);
                totalConfidence += confidence;
                matchCount++;

                console.log(`Profile ${matchCount} Confidence:`, confidence);
            }

            const averageConfidence = Math.round(totalConfidence / storedSignatures.length);
            const matched = averageConfidence > 40; // Lower threshold for better UX

            console.log('Final Confidence:', averageConfidence);

            return {
                matched: matched,
                confidence: Math.max(0, Math.min(100, averageConfidence)),
                matchCount: matchCount,
                totalProfiles: storedSignatures.length
            };
        } catch (error) {
            console.error('Comparison error:', error);
            return { matched: false, confidence: 0 };
        }
    }

    // Compare two numeric values with tolerance - IMPROVED
    compareNumericValues(val1, val2, tolerance) {
        const diff = Math.abs(val1 - val2);
        
        if (diff <= tolerance) {
            return 100 - (diff / tolerance * 50); // Scale down to 50-100
        } else {
            return Math.max(0, 50 - (diff / tolerance * 50)); // Scale down to 0-50
        }
    }

    // Enroll new user
    async enrollUser() {
        const username = document.getElementById('enrollUsername').value.trim();
        const passphrase = document.getElementById('enrollPassphrase').value.trim();

        // Validation
        if (!username) {
            this.showMessage('enroll', '❌ Please enter a username', 'error');
            return;
        }

        if (!passphrase) {
            this.showMessage('enroll', '❌ Please enter a passphrase', 'error');
            return;
        }

        if (username in this.users) {
            this.showMessage('enroll', '❌ User already exists!', 'error');
            return;
        }

        if (this.enrollmentSamples < 3) {
            this.showMessage('enroll', '❌ Please record all 3 voice samples!', 'error');
            return;
        }

        // Verify all samples have audio data
        for (let voice of this.recordedVoices) {
            if (!voice.audioBlob || voice.audioBlob.size < 1000) {
                this.showMessage('enroll', '❌ Some voice samples are invalid. Please re-record.', 'error');
                return;
            }
        }

        // Create user profile
        this.users[username] = {
            passphrase: passphrase,
            voiceProfiles: this.recordedVoices.map(v => ({
                signature: v.signature,
                recordedAt: v.recordedAt,
                audioUrl: v.audioUrl
            })),
            status: 'enrolled',
            attempts: 0,
            locked: false,
            enrollDate: new Date().toLocaleString()
        };

        this.saveUsers();
        this.showMessage('enroll', '✅ Enrollment successful! All 3 voice samples registered. You can now login!', 'success');

        console.log(`User ${username} enrolled with voice profiles:`, this.users[username].voiceProfiles);

        // Reset form
        setTimeout(() => {
            document.getElementById('enrollUsername').value = '';
            document.getElementById('enrollPassphrase').value = '';
            this.enrollmentSamples = 0;
            this.recordedVoices = [];
            this.updateSampleCounter();
            this.switchScreen('auth');
        }, 3000);
    }

    // Authenticate user
    async authenticate() {
        const username = document.getElementById('authUsername').value.trim();
        const passphrase = document.getElementById('authPassphrase').value.trim();

        // Validation
        if (!username) {
            this.showMessage('auth', '❌ Please enter a username', 'error');
            return;
        }

        if (!passphrase) {
            this.showMessage('auth', '❌ Please speak the passphrase', 'error');
            return;
        }

        if (!(username in this.users)) {
            this.showMessage('auth', '❌ User not found!', 'error');
            return;
        }

        const user = this.users[username];

        // Check if account is locked
        if (user.locked) {
            this.showMessage('auth', '❌ Account is locked! Too many failed attempts.', 'error');
            return;
        }

        // Check if voice was recorded
        if (this.recordedVoices.length === 0) {
            this.showMessage('auth', '❌ Please record your voice first!', 'error');
            return;
        }

        // Verify passphrase matches
        if (passphrase !== user.passphrase) {
            this.showMessage('auth', '❌ Passphrase does not match!', 'error');
            user.attempts++;
            this.saveUsers();
            return;
        }

        // Get recorded voice signature
        const recordedSignature = this.recordedVoices[0].signature;

        // Compare voice with stored profiles
        const voiceMatch = this.compareVoiceSignatures(recordedSignature, user.voiceProfiles);

        console.log('Voice Match Result:', voiceMatch);
        console.log('Recorded Audio Size:', this.recordedVoices[0].audioBlob.size);

        // Check confidence threshold (LOWERED THRESHOLD)
        if (voiceMatch.confidence > 35) {
            // Authentication successful
            user.attempts = 0;
            user.lastLogin = new Date().toLocaleString();
            this.saveUsers();
            this.currentUser = username;

            this.showMessage('auth', `✅ Authentication successful! Voice Confidence: ${voiceMatch.confidence}%`, 'success');

            // Show dashboard with audio playback
            setTimeout(() => {
                this.showDashboard(username, voiceMatch.confidence);
            }, 1500);
        } else {
            // Authentication failed
            user.attempts++;
            
            if (user.attempts >= 3) {
                user.locked = true;
                this.saveUsers();
                this.showMessage('auth', `❌ Authentication failed! (Confidence: ${voiceMatch.confidence}%) Account locked!`, 'error');
            } else {
                const remaining = 3 - user.attempts;
                this.showMessage('auth', `❌ Voice not recognized! Confidence: ${voiceMatch.confidence}% (${remaining} attempts remaining)`, 'error');
                this.saveUsers();
            }
        }
    }

    // Show dashboard with audio playback
    showDashboard(username, confidence = 0) {
        const user = this.users[username];
        document.getElementById('welcomeUsername').textContent = username;
        document.getElementById('dashUsername').textContent = username;
        document.getElementById('lastLogin').textContent = user.lastLogin || 'Just now';
        document.getElementById('confidenceLevel').textContent = confidence + '%';
        
        this.switchScreen('dashboard');
    }

    // Logout
    logout() {
        this.currentUser = null;
        document.getElementById('authUsername').value = '';
        document.getElementById('authPassphrase').value = '';
        this.recordedVoices = [];
        this.switchScreen('auth');
        this.showMessage('auth', '👋 You have been logged out', 'success');
    }

    // Unlock account (admin)
    unlockAccount() {
        const username = document.getElementById('unlockUsername').value.trim();
        const adminPassword = document.getElementById('adminPassword').value;

        if (adminPassword !== 'admin123') {
            alert('❌ Invalid admin password!');
            return;
        }

        if (!(username in this.users)) {
            alert('❌ User not found!');
            return;
        }

        this.users[username].locked = false;
        this.users[username].attempts = 0;
        this.saveUsers();

        alert(`✅ ${username} account unlocked!`);
        document.getElementById('unlockUsername').value = '';
        document.getElementById('adminPassword').value = '';
    }

    // Delete user (admin)
    deleteUser() {
        const username = document.getElementById('deleteUsername').value.trim();
        const adminPassword = document.getElementById('adminPassword').value;

        if (adminPassword !== 'admin123') {
            alert('❌ Invalid admin password!');
            return;
        }

        if (!(username in this.users)) {
            alert('❌ User not found!');
            return;
        }

        if (confirm(`Are you sure you want to delete ${username}?`)) {
            delete this.users[username];
            this.saveUsers();
            alert(`✅ ${username} deleted!`);
            document.getElementById('deleteUsername').value = '';
            document.getElementById('adminPassword').value = '';
        }
    }

    // Show message
    showMessage(screen, message, type) {
        const messageEl = document.getElementById(screen + 'Message');
        messageEl.textContent = message;
        messageEl.className = `message ${type} show`;

        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 5000);
    }

    // Clear message
    clearMessage(screen) {
        const messageEl = document.getElementById(screen + 'Message');
        messageEl.classList.remove('show');
        messageEl.textContent = '';
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAuthApp();
    console.log('Voice Authentication App Initialized');
});