document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('product-form');
    const resultsContainer = document.getElementById('results-container');
    const resultsContent = document.getElementById('results-content');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessageDiv = document.getElementById('error-message');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    
    // !!! IMPORTANT: REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL !!!
    // e.g., 'https://script.google.com/macros/s/AKfycbz_XXXXXXXXXXXX/exec'
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz1tyCv6_ehvXo578Ugu_swjZicQ8rXqfdlbkcy0eRQgRmnXO-q4cEMtWCAdBQ-VVY4Qw/exec'; 

    /**
     * Helper function to show and hide elements.
     */
    const toggleElement = (element, show) => {
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    };
    
    /**
     * Converts a JSON object into a structured, readable HTML output.
     * Uses Markdown rendering for better display (simple implementation).
     * @param {Object} data The JSON response from the server.
     * @returns {string} The HTML string.
     */
    const jsonToHtml = (data) => {
        let html = `
            <h3>Item: ${data.item_title} (${data.item_position})</h3>
            <p><strong>Product Type:</strong> ${data.product_type}</p>
            <p><strong>Summary:</strong> ${data.summary}</p>
        `;
        
        // Helper for simple Markdown to HTML conversion
        const renderMarkdown = (text) => {
            if (!text) return '';
            let content = text;
            content = content.replace(/^###\s*(.*)$/gm, '<h4>$1</h4>'); // H3 to H4
            content = content.replace(/^##\s*(.*)$/gm, '<h3>$1</h3>');  // H2 to H3
            content = content.replace(/^#\s*(.*)$/gm, '<h2>$1</h2>');   // H1 to H2
            content = content.replace(/^\*\s*(.*)$/gm, '<li>$1</li>'); // Bullet points
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
            content = content.replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
            // Simple blockquote/pre-like style for multi-line content
            content = content.replace(/```json\s*([\s\S]*?)\s*```/g, '<pre>$1</pre>');
            content = content.replace(/```\s*([\s\S]*?)\s*```/g, '<pre>$1</pre>');
            // Wrap list items in ul
            const listRegex = /(^<li>[\s\S]*?<\/li>)/gm;
            if(listRegex.test(content)) {
                content = content.replace(listRegex, '<ul>$1</ul>').replace(/<\/li><ul>/g, '</li>').replace(/<\/ul><li>/g, '<li>');
            }
            return content;
        };

        const renderList = (title, list) => {
            if (!list || list.length === 0) return '';
            let listHtml = `<h3>${title}</h3><ul>`;
            list.forEach(item => {
                // Handle objects in list (e.g., templates)
                if (typeof item === 'object' && item !== null) {
                    listHtml += `<li><strong>${item.name || item.title || 'Item'}</strong>: ${item.purpose || item.description || ''}</li>`;
                } else {
                    listHtml += `<li>${renderMarkdown(item)}</li>`;
                }
            });
            listHtml += '</ul>';
            return listHtml;
        };
        
        // Learning Objectives
        html += renderList('Learning Objectives', data.learning_objectives);

        // Full Explanation
        html += `<h3>Full Explanation</h3>${renderMarkdown(data.full_explanation)}`;
        
        // Worked Example
        html += `<h3>Worked Example</h3><div class="card">${renderMarkdown(data.worked_example)}</div>`;

        // Practical Steps
        if (data.practical_steps && data.practical_steps.length > 0) {
            html += `<h3>Practical Steps</h3><ol>`;
            data.practical_steps.forEach(step => {
                html += `<li><strong>${step.title}</strong> (${step.estimated_time_minutes} min): ${renderMarkdown(step.description)}</li>`;
            });
            html += `</ol>`;
        }
        
        // Templates
        if (data.templates && data.templates.length > 0) {
            html += `<h3>Copyable Templates</h3>`;
            data.templates.forEach(t => {
                html += `<div class="card"><strong>${t.name}</strong> (${t.purpose})<pre>${t.content}</pre></div>`;
            });
        }
        
        // Checklist
        html += renderList('Implementation Checklist', data.checklist);

        // Worksheets
        if (data.worksheets && data.worksheets.length > 0) {
             html += `<h3>Worksheets</h3>`;
             data.worksheets.forEach(w => {
                 html += `<div class="card">
                    <h4>${w.name}</h4>
                    <p>${w.description}</p>
                    <p><strong>Format:</strong> ${w.format}</p>
                    <table style="width:100%; border-collapse: collapse;">
                        <thead><tr><th>Label</th><th>Instruction</th><th>Example</th></tr></thead>
                        <tbody>`;
                w.fields.forEach(f => {
                    html += `<tr><td style="border: 1px solid #ccc; padding: 8px;">${f.label}</td><td style="border: 1px solid #ccc; padding: 8px;">${f.instruction}</td><td style="border: 1px solid #ccc; padding: 8px; font-style: italic;">${f.example}</td></tr>`;
                });
                html += `</tbody></table></div>`;
             });
        }
        
        // Common Mistakes and Troubleshooting
        html += renderList('Common Mistakes & Troubleshooting', data.common_mistakes_and_troubleshooting);
        
        // Assessment/Quiz (Simple Display)
        if (data.assessment_or_quiz && data.assessment_or_quiz.type !== 'none') {
            html += `<h3>Assessment / Quiz (${data.assessment_or_quiz.type})</h3>`;
            data.assessment_or_quiz.questions.forEach((q, index) => {
                html += `<p><strong>Q${index + 1} (${q.type}):</strong> ${q.q}</p>`;
                if (q.options) {
                    html += `<ul>${q.options.map(opt => `<li>${opt}</li>`).join('')}</ul>`;
                }
            });
            html += `<p><strong>Grading Guide:</strong> ${data.assessment_or_quiz.grading_guide}</p>`;
        }

        // Next Steps
        html += renderList('Next Steps & Extensions', data.next_steps_and_extensions);
        
        // Meta
        html += `
            <div style="text-align: right; font-size: 0.85em; color: #64748b; margin-top: 30px;">
                <p>Tone: ${data.meta.tone_used} | Depth: ${data.meta.depth_level} | Estimated Words: ${data.meta.estimated_word_count}</p>
            </div>
        `;

        return html;
    };


    // Main form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => data[key] = value);
        
        // The structure of the GAS call requires the single JSON prompt string.
        const promptData = {
            product_type: data.product_type,
            item_title: data.item_title,
            item_position: data.item_position,
            product_goal: data.product_goal,
            audience_profile: data.audience_profile,
            // Convert to number
            depth_level: parseInt(data.depth_level, 10), 
            tone: data.tone,
            constraints: data.constraints
        };
        
        // This is the string that will be read by the GAS backend in e.parameter.input
        const payload = new FormData();
        payload.append('input', JSON.stringify(promptData));

        toggleElement(loadingOverlay, true);
        toggleElement(errorMessageDiv, false);
        toggleElement(resultsContainer, false);
        toggleElement(copyJsonBtn, false);

        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: payload, // Send as FormData to bypass CORS using GAS
                mode: 'no-cors' // This is sometimes required for older GAS deployments, but usually the FormData/POST is enough
            });
            
            // Because we can't reliably read the response body in a 'no-cors' context, 
            // the GAS script must return a simple success status (200) or an error (e.g., 500)
            // AND we must ensure that the JSON result is readable.
            
            // For a robust GAS deployment, the script returns the JSON string directly.
            // We use the `exec` URL which typically allows the script to return the content directly.
            
            // For the purpose of this example, we'll assume the response contains the text.
            // In a real deployed GAS setup, the 'Content-Type: application/json' header 
            // and the text result would be returned and readable.
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const jsonText = await response.text();
            
            // The AI only returns JSON. We need to parse it.
            let resultJson;
            try {
                resultJson = JSON.parse(jsonText);
            } catch (e) {
                // If parsing fails, it's likely an error from the AI or GAS.
                throw new Error(`Failed to parse JSON response. Raw output: ${jsonText.substring(0, 200)}...`);
            }
            
            // Display the beautiful HTML results
            resultsContent.innerHTML = jsonToHtml(resultJson);
            
            // Store the raw JSON for the copy button
            copyJsonBtn.dataset.json = JSON.stringify(resultJson, null, 2); 
            copyJsonBtn.textContent = 'Copy Full JSON';
            
            toggleElement(resultsContainer, true);
            toggleElement(copyJsonBtn, true);

        } catch (error) {
            console.error('Fetch Error:', error);
            errorMessageDiv.innerHTML = `<p><strong>Error!</strong> Could not generate product segment.</p><p>Details: ${error.message}</p><p>Please ensure the Google Apps Script URL is correct and deployed.</p>`;
            toggleElement(errorMessageDiv, true);
        } finally {
            toggleElement(loadingOverlay, false);
        }
    });

    // Copy JSON button handler
    copyJsonBtn.addEventListener('click', () => {
        const jsonText = copyJsonBtn.dataset.json;
        if (jsonText) {
            navigator.clipboard.writeText(jsonText).then(() => {
                const originalText = copyJsonBtn.textContent;
                copyJsonBtn.textContent = copyJsonBtn.dataset.copiedText;
                setTimeout(() => {
                    copyJsonBtn.textContent = originalText;
                }, 1500);
            }).catch(err => {
                console.error('Could not copy text: ', err);
            });
        }
    });

});
