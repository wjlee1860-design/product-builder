document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        body.classList.toggle('dark-mode');

        const isLightMode = body.classList.contains('light-mode');
        themeToggle.textContent = isLightMode ? 'Dark Mode' : 'Light Mode';
    });

    // Copy code button
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent card click animation
            const codeToCopy = button.dataset.code;

            navigator.clipboard.writeText(codeToCopy).then(() => {
                button.textContent = 'Copied!';
                button.classList.add('success');
                setTimeout(() => {
                    button.textContent = 'Copy Code';
                    button.classList.remove('success');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    });
});
