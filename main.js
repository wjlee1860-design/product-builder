document.addEventListener('DOMContentLoaded', () => {
    const htmlInput = document.getElementById('html-input');
    const cssInput = document.getElementById('css-input');
    const htmlFileInput = document.getElementById('html-file-input');
    const cssFileInput = document.getElementById('css-file-input');
    const previewFrame = document.getElementById('preview-frame');
    const convertBtn = document.getElementById('convert-btn');
    const yamlOutput = document.getElementById('yaml-output');
    const copyYamlBtn = document.getElementById('copy-yaml-btn');

    let currentHtml = '';
    let currentCss = '';

    // --- Tab Functionality ---
    const tabs = document.querySelectorAll('.tab-link');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.getElementById(tab.dataset.tab);
            
            document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            target.classList.add('active');
            updatePreview();
        });
    });

    // --- Live Preview Update ---
    const updatePreview = () => {
        const source = `<html><head><style>${currentCss}</style></head><body>${currentHtml}</body></html>`;
        previewFrame.srcdoc = source;
    };

    // --- Event Listeners for Input ---
    htmlInput.addEventListener('input', () => { currentHtml = htmlInput.value; updatePreview(); });
    cssInput.addEventListener('input', () => { currentCss = cssInput.value; updatePreview(); });

    htmlFileInput.addEventListener('change', async (e) => {
        if (e.target.files[0]) { currentHtml = await e.target.files[0].text(); updatePreview(); }
    });

    cssFileInput.addEventListener('change', async (e) => {
        if (e.target.files[0]) { currentCss = await e.target.files[0].text(); updatePreview(); }
    });

    // --- Conversion Logic ---
    convertBtn.addEventListener('click', () => {
        if (!currentHtml) {
            alert("Please provide some HTML content first.");
            return;
        }

        try {
            const yaml = generateYamlFromHtml(currentHtml, currentCss);
            
            // **YAML Validation Step**
            try {
                jsyaml.load(yaml); // Attempt to parse the generated YAML
                yamlOutput.value = yaml;
                yamlOutput.style.borderColor = ''; // Reset border color
                copyYamlBtn.disabled = false;
            } catch (validationError) {
                console.error("Generated YAML is invalid:", validationError);
                yamlOutput.style.borderColor = 'red';
                yamlOutput.value = `--- YAML SYNTAX ERROR ---\n${validationError.message}\n\n--- GENERATED CODE (for debugging) ---\n${yaml}`;
                copyYamlBtn.disabled = true;
            }

        } catch (error) {
            console.error("Error generating YAML:", error);
            yamlOutput.value = `Error: ${error.message}`;
            copyYamlBtn.disabled = true;
        }
    });

    // --- Copy Button ---
    copyYamlBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(yamlOutput.value).then(() => {
            copyYamlBtn.textContent = 'Copied!';
            setTimeout(() => { copyYamlBtn.textContent = 'Copy YAML'; }, 2000);
        }).catch(err => console.error('Failed to copy YAML: ', err));
    });
});

function generateYamlFromHtml(html, css) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;

    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(css);

    let mainComponentName = "MyPowerAppComponent"; // Define a main component name
    let yamlObject = {
        ComponentDefinitions: {
            [mainComponentName]: {
                DefinitionType: 'CanvasComponent',
                Properties: {},
                Children: []
            }
        }
    };

    const children = Array.from(tempContainer.children).map(element => processElement(element, styleSheet));
    yamlObject.ComponentDefinitions[mainComponentName].Children = children;

    // Convert the JavaScript object to a YAML string
    // The js-yaml library can do this, but for this specific format, manual generation is more direct.
    // Note: A full object-to-YAML library would be safer for complex cases.
    return objectToYaml(yamlObject, 0);
}

function processElement(element, styleSheet) {
    const controlName = getControlName(element);
    const controlType = getControlType(element);

    const properties = {};
    const children = [];

    // Apply Styles
    const styles = getAppliedStyles(element, styleSheet);

    if (element.textContent && !element.children.length) {
        properties.Text = `="${element.textContent.trim().replace(/\n/g, ' ')}"`;
    }
    if (styles['background-color']) properties.Fill = `=RGBA(${cssColorToRgba(styles['background-color'])})`;
    if (styles['color']) properties.Color = `=RGBA(${cssColorToRgba(styles['color'])})`;
    if (styles['width']) properties.Width = `=${parseInt(styles['width']) || 0}`;
    if (styles['height']) properties.Height = `=${parseInt(styles['height']) || 0}`;

    // Recursively process children
    if (element.children.length > 0) {
        Array.from(element.children).forEach(child => {
            children.push(processElement(child, styleSheet));
        });
    }

    const control = { [controlName]: { Control: controlType, Properties: properties } };
    if (children.length > 0) {
        control[controlName].Children = children;
    }
    return control;
}

function getAppliedStyles(element, styleSheet) {
    const styles = {};
    try {
        for (const rule of styleSheet.cssRules) {
            if (element.matches(rule.selectorText)) {
                for (const style of rule.style) {
                    styles[style] = rule.style[style];
                }
            }
        }
    } catch (e) {
        console.warn("Could not process stylesheet:", e);
    }
    return styles;
}

function getControlName(element) {
    if (element.id) return element.id.charAt(0).toUpperCase() + element.id.slice(1);
    if (element.className) return element.className.split(' ')[0].replace(/-(\w)/g, (_, w) => w.toUpperCase());
    return `${element.tagName.charAt(0)}${element.tagName.slice(1).toLowerCase()}Control`;
}

function getControlType(element) {
    switch (element.tagName.toLowerCase()) {
        case 'div': case 'section': case 'header': case 'footer': case 'main': return 'GroupContainer@1.4.0';
        case 'button': return 'Button@0.0.45';
        case 'p': case 'span': case 'h1': case 'h2': case 'h3': return 'Label@2.5.1';
        case 'img': return 'Image@2.2.3';
        case 'input': return 'TextInput@0.0.54';
        default: return 'Label@2.5.1';
    }
}

function cssColorToRgba(colorStr) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return '0, 0, 0, 1'; 
  ctx.fillStyle = colorStr.trim();
  const color = ctx.fillStyle.toLowerCase();
  if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16) || 0;
      const g = parseInt(color.slice(3, 5), 16) || 0;
      const b = parseInt(color.slice(5, 7), 16) || 0;
      const a = color.length > 7 ? (parseInt(color.slice(7, 9), 16) / 255).toFixed(2) : '1';
      return `${r}, ${g}, ${b}, ${a}`;
  } 
  if (color.startsWith('rgb')) {
      const parts = color.match(/[\d.]+/g) || ['0', '0', '0', '1'];
      while (parts.length < 4) parts.push('1');
      return parts.slice(0, 4).join(', ');
  }
  return '0, 0, 0, 1';
}

// Custom function to convert a JS object to the specific YAML format required.
function objectToYaml(obj, indentLevel) {
    let yamlString = '';
    const indent = ' '.repeat(indentLevel);

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (Array.isArray(value)) {
                yamlString += `${indent}${key}:\n`;
                value.forEach(item => {
                    // In our structure, arrays contain objects, so we need to handle the dash `-`
                    const childIndent = ' '.repeat(indentLevel + 2);
                    const childKey = Object.keys(item)[0];
                    yamlString += `${childIndent}- ${childKey}:\n`;
                    yamlString += objectToYaml(item[childKey], indentLevel + 4);
                });
            } else if (typeof value === 'object' && value !== null) {
                yamlString += `${indent}${key}:\n`;
                yamlString += objectToYaml(value, indentLevel + 2);
            } else {
                yamlString += `${indent}${key}: ${value}\n`;
            }
        }
    }
    return yamlString;
}
