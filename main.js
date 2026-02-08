document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle --- //
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        body.classList.toggle('dark-mode');
        const isLightMode = body.classList.contains('light-mode');
        themeToggle.textContent = isLightMode ? 'Dark Mode' : 'Light Mode';
    });

    // --- Legacy Code Copy Buttons --- //
    document.querySelectorAll('.copy-btn[data-code]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(button, button.dataset.code);
        });
    });

    // --- YAML Generator --- //
    const htmlFileInput = document.getElementById('html-file-input');
    const cssFileInput = document.getElementById('css-file-input');
    const generateBtn = document.getElementById('generate-yaml-btn');
    const yamlOutput = document.getElementById('yaml-output');
    const downloadBtn = document.getElementById('download-yaml-btn');
    const copyYamlBtn = document.getElementById('copy-yaml-btn');

    generateBtn.addEventListener('click', async () => {
        const htmlFile = htmlFileInput.files[0];
        const cssFile = cssFileInput.files[0];

        if (!htmlFile) {
            alert('HTML 파일을 선택하세요.');
            return;
        }

        try {
            let htmlContent = await readFileAsText(htmlFile);
            if (cssFile) {
                const cssContent = await readFileAsText(cssFile);
                // Inject CSS into a style tag in the HTML head
                const styleTag = `<style>${cssContent}</style>`;
                htmlContent = htmlContent.replace("</head>", `${styleTag}</head>`);
            }

            const yamlCode = convertToYaml(htmlContent);
            yamlOutput.value = yamlCode;
            downloadBtn.disabled = false;
            copyYamlBtn.disabled = false;

        } catch (error) {
            console.error("YAML Generation Error:", error);
            alert(`YAML 생성에 실패했습니다: ${error.message}`);
            yamlOutput.value = `오류: ${error.message}`;
            downloadBtn.disabled = true;
            copyYamlBtn.disabled = true;
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!yamlOutput.value) return;
        const blob = new Blob([yamlOutput.value], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'powerapps-component.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    copyYamlBtn.addEventListener('click', () => {
        if (!yamlOutput.value) return;
        copyToClipboard(copyYamlBtn, yamlOutput.value);
    });
});

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('success');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('success');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert("복사에 실패했습니다.");
    });
}

function convertToYaml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    
    // Find the first element in the body, or a specific target element
    const element = doc.body.firstElementChild;

    if (!element || !(element instanceof HTMLElement)) {
        throw new Error("변환할 유효한 HTML 요소를 찾을 수 없습니다. <body> 태그 안에 요소가 있는지 확인하세요.");
    }

    // Get computed styles
    const computedStyle = window.getComputedStyle(element);

    const componentName = "GeneratedComponent";
    let yaml = `${componentName}:\n`;
    
    yaml += `    Text: |=\n        ="${element.textContent.trim()}"\n`;

    const properties = {
        Fill: `ColorValue("${computedStyle.backgroundColor || 'transparent'}")`,
        Color: `ColorValue("${computedStyle.color || 'black'}")`,
        Width: parseInt(computedStyle.width) || 180,
        Height: parseInt(computedStyle.height) || 60,
        PaddingTop: parseInt(computedStyle.paddingTop) || 0,
        PaddingRight: parseInt(computedStyle.paddingRight) || 0,
        PaddingBottom: parseInt(computedStyle.paddingBottom) || 0,
        PaddingLeft: parseInt(computedStyle.paddingLeft) || 0,
        BorderThickness: parseInt(computedStyle.borderWidth) || 0,
        BorderStyle: `BorderStyle.${computedStyle.borderStyle}`,
        BorderColor: `ColorValue("${computedStyle.borderColor || 'transparent'}")`,
        RadiusTopLeft: parseInt(computedStyle.borderTopLeftRadius) || 0,
        RadiusTopRight: parseInt(computedStyle.borderTopRightRadius) || 0,
        RadiusBottomLeft: parseInt(computedStyle.borderBottomLeftRadius) || 0,
        RadiusBottomRight: parseInt(computedStyle.borderBottomRightRadius) || 0,
        FontWeight: `FontWeight.${computedStyle.fontWeight > 600 ? 'Bold' : (computedStyle.fontWeight < 500 ? 'Normal' : 'Semibold')}`,
        FontSize: parseInt(computedStyle.fontSize) || 15,
    };

    for (const [key, value] of Object.entries(properties)) {
        // Add property if it has a meaningful value
        if (value && value !== 0 && value !== `ColorValue("transparent")` && value !== `ColorValue("rgba(0, 0, 0, 0)")`) {
             yaml += `    ${key}: =${value}\n`;
        }
    }

    return yaml;
}
