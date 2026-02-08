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
    const htmlInput = document.getElementById('html-input');
    const generateBtn = document.getElementById('generate-yaml-btn');
    const yamlOutput = document.getElementById('yaml-output');
    const downloadBtn = document.getElementById('download-yaml-btn');
    const copyYamlBtn = document.getElementById('copy-yaml-btn');

    generateBtn.addEventListener('click', () => {
        const htmlCode = htmlInput.value;
        if (!htmlCode.trim()) {
            alert('HTML 코드를 입력하세요.');
            return;
        }

        try {
            const yamlCode = convertToYaml(htmlCode);
            yamlOutput.value = yamlCode;
            downloadBtn.disabled = false;
            copyYamlBtn.disabled = false;
        } catch (error) {
            console.error("YAML Generation Error:", error);
            alert("YAML 생성에 실패했습니다. HTML 형식을 확인해주세요.");
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
    const element = doc.body.firstChild;

    if (!element || !(element instanceof HTMLElement)) {
        throw new Error("유효한 HTML 요소를 찾을 수 없습니다.");
    }

    const componentName = "GeneratedComponent"; // Or derive from element
    let yaml = `${componentName}:\n`;
    
    // --- Basic Properties ---
    yaml += `    Text: |=\n        ="${element.textContent.trim()}"\n`;

    // --- Style Properties ---
    const style = element.style;
    const properties = {
        Fill: `ColorValue("${style.backgroundColor || 'transparent'}")`,
        Color: `ColorValue("${style.color || 'black'}")`,
        Width: style.width ? parseInt(style.width) : 180,
        Height: style.height ? parseInt(style.height) : 60,
        PaddingTop: parseInt(style.paddingTop) || parseInt(style.padding) || 10,
        PaddingRight: parseInt(style.paddingRight) || parseInt(style.padding) || 10,
        PaddingBottom: parseInt(style.paddingBottom) || parseInt(style.padding) || 10,
        PaddingLeft: parseInt(style.paddingLeft) || parseInt(style.padding) || 10,
        BorderThickness: style.border ? parseInt(style.border) : 0,
        BorderStyle: style.borderStyle ? `BorderStyle.${style.borderStyle}` : `BorderStyle.Solid`,
        BorderColor: `ColorValue("${style.borderColor || 'transparent'}")`,
        RadiusTopLeft: parseInt(style.borderTopLeftRadius) || 0,
        RadiusTopRight: parseInt(style.borderTopRightRadius) || 0,
        RadiusBottomLeft: parseInt(style.borderBottomLeftRadius) || 0,
        RadiusBottomRight: parseInt(style.borderBottomRightRadius) || 0,
    };

    for (const [key, value] of Object.entries(properties)) {
        if (value !== null && value !== undefined && value !== '' && value !== 0 && value !== `ColorValue("transparent")`) {
            yaml += `    ${key}: =${value}\n`;
        }
    }

    return yaml;
}
