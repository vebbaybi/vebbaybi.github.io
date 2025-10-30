// Portfolio Configuration
const sections = {
    ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1920&h=1080&fit=crop&auto=format&q=80",
    data: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&auto=format&q=80",
    embedded: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=1080&fit=crop&auto=format&q=80",
    blockchain: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&h=1080&fit=crop&auto=format&q=80",
    about: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&h=1080&fit=crop&auto=format&q=80",
    contact: "https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1920&h=1080&fit=crop&auto=format&q=80",
    link: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&h=1080&fit=crop&auto=format&q=80"
};

const typewriterLines = [
    { part1: "THE", part2: "1807" },
    { part1: "computer", part2: "scientist" },
    { part1: "Web", part2: "Dev" },
    { part1: "AI", part2: "Enthusiast" },
    { part1: "data", part2: "analyst" },
    { part1: "embedded", part2: "enthusiast" }
];

// State
let activeSection = "ai";
let cursorType = "default";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeBackground();
    initializeNavigation();
    initializeTypewriter();
    initializeCursor();
    initializeKeyboardNavigation();
});

// Background Management
function initializeBackground() {
    const bgImage = document.getElementById('backgroundImage');
    bgImage.style.backgroundImage = `url(${sections[activeSection]})`;
}

function changeSection(sectionId) {
    if (activeSection === sectionId) return;
    
    const bgImage = document.getElementById('backgroundImage');
    
    // Fade out
    bgImage.classList.add('fade-out');
    
    // Change image and fade in
    setTimeout(() => {
        activeSection = sectionId;
        bgImage.style.backgroundImage = `url(${sections[sectionId]})`;
        bgImage.classList.remove('fade-out');
    }, 400);
}

// Navigation
function initializeNavigation() {
    const navButtons = document.querySelectorAll('[data-section]');
    
    navButtons.forEach(button => {
        const section = button.getAttribute('data-section');
        
        button.addEventListener('mouseenter', () => {
            changeSection(section);
            setCursorType('pointer');
        });
        
        button.addEventListener('mouseleave', () => {
            changeSection('ai');
            setCursorType('default');
        });
        
        button.addEventListener('click', () => {
            changeSection(section);
        });
        
        button.addEventListener('focus', () => {
            changeSection(section);
        });
        
        button.addEventListener('blur', () => {
            changeSection('ai');
        });
    });
}

// Typewriter Effect
function initializeTypewriter() {
    const typewriterElement = document.getElementById('typewriterText');
    let currentLineIndex = 0;
    
    function typeLine(lineIndex) {
        if (lineIndex >= typewriterLines.length) {
            // Show final text permanently
            typewriterElement.innerHTML = 'computer<span style="margin: 0 0.5rem">·</span>scientist';
            return;
        }
        
        const line = typewriterLines[lineIndex];
        let text1 = '';
        let text2 = '';
        let charIndex1 = 0;
        let charIndex2 = 0;
        let phase = 1; // 1 = typing first word, 2 = typing second word
        
        const interval = setInterval(() => {
            if (phase === 1) {
                if (charIndex1 < line.part1.length) {
                    text1 += line.part1[charIndex1];
                    typewriterElement.innerHTML = text1 + '<span class="cursor-blink"></span>';
                    charIndex1++;
                } else {
                    phase = 2;
                }
            } else if (phase === 2) {
                if (charIndex2 < line.part2.length) {
                    text2 += line.part2[charIndex2];
                    typewriterElement.innerHTML = text1 + '<span style="margin: 0 0.5rem">·</span>' + text2 + '<span class="cursor-blink"></span>';
                    charIndex2++;
                } else {
                    clearInterval(interval);
                    setTimeout(() => {
                        typeLine(lineIndex + 1);
                    }, 800);
                }
            }
        }, 40);
    }
    
    // Start typewriter after initial animations
    setTimeout(() => {
        typeLine(0);
    }, 800);
}

// Keyboard Navigation
function initializeKeyboardNavigation() {
    const mainSections = ['ai', 'data', 'embedded', 'blockchain'];
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            
            const currentIndex = mainSections.indexOf(activeSection);
            let newIndex;
            
            if (e.key === 'ArrowLeft') {
                newIndex = (currentIndex - 1 + mainSections.length) % mainSections.length;
            } else {
                newIndex = (currentIndex + 1) % mainSections.length;
            }
            
            changeSection(mainSections[newIndex]);
        }
    });
}

// Custom Cursor
function initializeCursor() {
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');
    let mouseX = 0;
    let mouseY = 0;
    let dotX = 0;
    let dotY = 0;
    let ringX = 0;
    let ringY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        // Smooth cursor movement with spring effect
        const dotSpeed = 0.5;
        const ringSpeed = 0.15;
        
        dotX += (mouseX - dotX) * dotSpeed;
        dotY += (mouseY - dotY) * dotSpeed;
        
        ringX += (mouseX - ringX) * ringSpeed;
        ringY += (mouseY - ringY) * ringSpeed;
        
        cursorDot.style.transform = `translate(${dotX - 16}px, ${dotY - 16}px)`;
        cursorRing.style.transform = `translate(${ringX - 48}px, ${ringY - 48}px)`;
        
        requestAnimationFrame(animateCursor);
    }
    
    animateCursor();
    
    document.addEventListener('mouseleave', () => {
        cursorDot.style.opacity = '0';
        cursorRing.style.opacity = '0';
    });
    
    document.addEventListener('mouseenter', () => {
        cursorDot.style.opacity = '1';
        cursorRing.style.opacity = '0.6';
    });
}

function setCursorType(type) {
    cursorType = type;
    const body = document.body;
    
    body.classList.remove('cursor-default', 'cursor-pointer', 'cursor-grab');
    body.classList.add(`cursor-${type}`);
}
