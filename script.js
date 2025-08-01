 const canvas = document.getElementById('bubble-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let bubbles = [];
        const initialBubbles = 15;
        let startTime = Date.now();
        let timerId = null;

        // --- Bubble Class ---
        class Bubble {
            constructor(x, y, radius, maxRadius) {
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.maxRadius = maxRadius || Math.random() * 30 + 20;
                this.dx = (Math.random() - 0.5) * 1.5;
                this.dy = (Math.random() - 0.5) * 1.5;
                this.hue = Math.random() * 360;
                this.isGrowing = true;
                this.clickStartTime = 0; // Still used to track mousedown
                this.wobbleAngle = Math.random() * Math.PI * 2;
                this.wobbleSpeed = Math.random() * 0.05 + 0.01;
            }

            draw() {
                ctx.beginPath();
                const gradient = ctx.createRadialGradient(
                    this.x - this.radius * 0.25, this.y - this.radius * 0.25,
                    this.radius * 0.1, this.x, this.y, this.radius
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                gradient.addColorStop(0.5, `hsla(${this.hue}, 100%, 75%, 0.4)`);
                gradient.addColorStop(1, `hsla(${this.hue}, 100%, 75%, 0.1)`);
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.closePath();
            }

            update() {
                if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.dx = -this.dx;
                if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.dy = -this.dy;
                this.x += this.dx;
                this.y += this.dy;
                this.wobbleAngle += this.wobbleSpeed;
                this.y += Math.sin(this.wobbleAngle) * 0.5;
                if (this.isGrowing && this.radius < this.maxRadius) {
                    this.radius += 0.5;
                } else {
                    this.isGrowing = false;
                }
                this.draw();
            }
        }

        function init() {
            bubbles = [];
            for (let i = 0; i < initialBubbles; i++) {
                const r = 5;
                const x = Math.random() * (canvas.width - r * 2) + r;
                const y = Math.random() * (canvas.height - r * 2) + r;
                bubbles.push(new Bubble(x, y, r));
            }
            startWastedTimePopupTimer();
        }

        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            bubbles.forEach(bubble => bubble.update());
        }

        function popBubble(index) {
            const popped = bubbles[index];
            bubbles.splice(index, 1);
            const newRadius = Math.max(popped.radius / 2, 5);
            bubbles.push(new Bubble(popped.x - newRadius, popped.y, 5, newRadius * 2));
            bubbles.push(new Bubble(popped.x + newRadius, popped.y, 5, newRadius * 2));
        }

        // --- Event Listeners ---
        canvas.addEventListener('mousedown', (e) => {
            bubbles.forEach(bubble => {
                const dist = Math.hypot(e.clientX - bubble.x, e.clientY - bubble.y);
                if (dist < bubble.radius) {
                    bubble.clickStartTime = Date.now();
                }
            });
        });

        canvas.addEventListener('mouseup', (e) => {
            for (let i = bubbles.length - 1; i >= 0; i--) {
                const bubble = bubbles[i];
                const dist = Math.hypot(e.clientX - bubble.x, e.clientY - bubble.y);
                // Check if the click was initiated on this bubble
                if (dist < bubble.radius && bubble.clickStartTime > 0) {
                    // Pop the bubble immediately without checking resistance
                    popBubble(i);
                    bubble.clickStartTime = 0; // Reset the start time
                }
            }
        });

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        });

        document.getElementById('close-popup').addEventListener('click', () => {
            document.getElementById('popup').style.display = 'none';
            startWastedTimePopupTimer();
        });

        document.getElementById('generate-thought-btn').addEventListener('click', generateDeepThought);

        // --- Wasted Time Popup ---
        function showWastedTimePopup() {
            const popup = document.getElementById('popup');
            const messageEl = document.getElementById('popup-message');
            const loader = document.getElementById('loader');
            const generateBtn = document.getElementById('generate-thought-btn');

            const elapsed = Date.now() - startTime;
            const minutesWasted = (elapsed / (1000 * 60)).toFixed(1);
            
            // Reset popup state
            loader.style.display = 'none';
            messageEl.style.display = 'block';
            generateBtn.disabled = false;
            messageEl.textContent = `You've wasted ${minutesWasted} minutes of your life.`;
            popup.style.display = 'block';
        }

        function startWastedTimePopupTimer() {
            if (timerId) clearTimeout(timerId);
            timerId = setTimeout(showWastedTimePopup, 120000); // 2 minutes
        }

        // --- Gemini API Integration ---
        async function generateDeepThought() {
            const messageEl = document.getElementById('popup-message');
            const loader = document.getElementById('loader');
            const generateBtn = document.getElementById('generate-thought-btn');

            messageEl.style.display = 'none';
            loader.style.display = 'block';
            generateBtn.disabled = true;

            const minutesWasted = ((Date.now() - startTime) / (1000 * 60)).toFixed(1);
            const prompt = `Generate a short, funny, and slightly philosophical "deep thought" about a person who has just spent ${minutesWasted} minutes popping virtual bubbles on a website. Keep it to one or two sentences.`;

            try {
                const thought = await callGeminiApi(prompt);
                messageEl.textContent = thought;
            } catch (error) {
                console.error("Error fetching deep thought:", error);
                messageEl.textContent = "Could not generate a thought. The universe is silent for now.";
            } finally {
                messageEl.style.display = 'block';
                loader.style.display = 'none';
                generateBtn.disabled = false;
            }
        }

        async function callGeminiApi(prompt, retries = 3, delay = 1000) {
            const apiKey = ""; // This will be handled by the environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };

            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`API response status: ${response.status}`);
                    }

                    const result = await response.json();
                    if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                        return result.candidates[0].content.parts[0].text.trim();
                    } else {
                        throw new Error("Invalid response structure from API.");
                    }
                } catch (error) {
                    if (i === retries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                }
            }
        }

        // --- Start Everything ---
        init();
        animate();