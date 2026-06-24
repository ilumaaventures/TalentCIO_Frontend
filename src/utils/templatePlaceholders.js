export const TEMPLATE_PLACEHOLDERS = [
    'candidateName',
    'firstName',
    'lastName',
    'fullName',
    'email',
    'phone',
    'workEmail',
    'mobile',
    'phoneNumber',
    'jobTitle',
    'designation',
    'client',
    'department',
    'offerDate',
    'dateOfOffer',
    'workLocation',
    'employmentDetails',
    'location',
    'managerName',
    'managerEmail',
    'recruiterName',
    'companyName',
    'requestId',
    'currentStatus',
    'interviewDate',
    'interviewLink',
    'customNote',
    'employeeCode',
    'exitType',
    'lastWorkingDay',
    'documentList',
    'documentListBlock',
    'personalNote',
    'offboardingStatus',
    'hrRemarks',
    'employeeFirstName',
    'employeeFullName',
    'employeeId',
    'joiningDate',
    'submissionDeadline',
    'portalLink',
    'credentialsSection',
    'requestedSectionsBlock',
    'requestedDocumentsBlock',
    'sharedFilesBlock',
    'deadlineBlock',
    'portalButton',
    'currentYear',
    'JD'
];

export const GENERAL_EMAIL_TEMPLATE_PLACEHOLDERS = [
    'firstName',
    'lastName',
    'fullName',
    'email',
    'workEmail',
    'mobile',
    'phoneNumber',
    'jobTitle',
    'designation',
    'department',
    'location',
    'managerName',
    'managerEmail',
    'companyName',
    'employeeCode',
    'exitType',
    'lastWorkingDay',
    'documentList',
    'documentListBlock',
    'personalNote',
    'offboardingStatus',
    'hrRemarks'
];

export const ONBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS = [
    'firstName',
    'lastName',
    'fullName',
    'email',
    'phone',
    'designation',
    'department',
    'offerDate',
    'dateOfOffer',
    'joiningDate',
    'workLocation',
    'submissionDeadline',
    'portalLink',
    'credentialsSection',
    'requestedSectionsBlock',
    'requestedDocumentsBlock',
    'sharedFilesBlock',
    'deadlineBlock',
    'portalButton',
    'currentYear'
];

export const OFFBOARDING_EMAIL_TEMPLATE_PLACEHOLDERS = [
    'firstName',
    'lastName',
    'fullName',
    'email',
    'designation',
    'department',
    'joiningDate',
    'lastWorkingDay',
    'exitType',
    'companyName',
    'currentYear'
];

export const getSupportedPlaceholderTokens = (placeholders = TEMPLATE_PLACEHOLDERS) => placeholders.map((placeholder) => `{{${placeholder}}}`);
const SUPPORTED_PLACEHOLDER_PATTERN = TEMPLATE_PLACEHOLDERS.join('|');
const TRUSTED_HTML_PLACEHOLDERS = new Set([
    'credentialsSection',
    'requestedSectionsBlock',
    'requestedDocumentsBlock',
    'sharedFilesBlock',
    'deadlineBlock',
    'portalButton',
    'documentListBlock',
    'personalNote'
]);
const ALLOWED_HTML_TAGS = new Set([
    'a', 'article', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'header', 'hr', 'i', 'img', 'li', 'main', 'ol', 'p', 'pre', 'section', 'small', 'span', 'strong', 'sub', 'sup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul'
]);
const ALLOWED_HTML_ATTRIBUTES = new Set([
    'align', 'alt', 'aria-label', 'aria-hidden', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'class',
    'colspan', 'height', 'href', 'rel', 'role', 'rowspan', 'src', 'style', 'target', 'title', 'valign', 'width'
]);
const STRIP_WITH_CONTENT_TAGS = new Set([
    'base', 'canvas', 'embed', 'form', 'iframe', 'input', 'link', 'math', 'meta', 'object', 'script',
    'select', 'style', 'svg', 'textarea'
]);
const UNSAFE_STYLE_VALUE_PATTERN = /expression\s*\(|javascript:|vbscript:|url\s*\(|@import|behavior\s*:|-moz-binding/i;

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const COMMON_PLACEHOLDER_BOUNDARY_REGEX = /(?<!\})\}(\s*)\{\{/g;
const SINGLE_BRACE_PLACEHOLDER_REGEX = new RegExp(`(?<!\\{)\\{\\s*(${SUPPORTED_PLACEHOLDER_PATTERN})\\s*\\}(?!\\})`, 'g');
const MISSING_OPEN_BRACE_PLACEHOLDER_REGEX = new RegExp(`(?<!\\{)\\{\\s*(${SUPPORTED_PLACEHOLDER_PATTERN})\\s*\\}\\}`, 'g');
const MISSING_CLOSE_BRACE_PLACEHOLDER_REGEX = new RegExp(`\\{\\{\\s*(${SUPPORTED_PLACEHOLDER_PATTERN})\\s*\\}(?!\\})`, 'g');
const CANONICAL_PLACEHOLDER_REGEX = new RegExp(`\\{\\{\\s*(${SUPPORTED_PLACEHOLDER_PATTERN})\\s*\\}\\}`, 'g');

export const normalizeTemplatePlaceholders = (template) => String(template || '')
    .replace(COMMON_PLACEHOLDER_BOUNDARY_REGEX, '}}$1{{')
    .replace(MISSING_OPEN_BRACE_PLACEHOLDER_REGEX, '{{$1}}')
    .replace(MISSING_CLOSE_BRACE_PLACEHOLDER_REGEX, '{{$1}}')
    .replace(SINGLE_BRACE_PLACEHOLDER_REGEX, '{{$1}}')
    .replace(CANONICAL_PLACEHOLDER_REGEX, '{{$1}}');

const getLineAndColumn = (input, index) => {
    const content = normalizeTemplatePlaceholders(input);
    const lines = content.slice(0, index).split('\n');
    return {
        line: lines.length,
        column: (lines[lines.length - 1] || '').length + 1
    };
};

export const validateTemplateSyntax = (template, allowedPlaceholders = TEMPLATE_PLACEHOLDERS) => {
    const content = normalizeTemplatePlaceholders(template);

    for (let index = 0; index < content.length - 1; index += 1) {
        const currentPair = content.slice(index, index + 2);

        if (currentPair === '{{') {
            const closingIndex = content.indexOf('}}', index + 2);
            if (closingIndex === -1) {
                const { line, column } = getLineAndColumn(content, index);
                return {
                    valid: false,
                    message: `Invalid placeholder syntax at line ${line}:${column}. Expected '}}' to close '{{'.`
                };
            }

            const token = content.slice(index + 2, closingIndex).trim();
            if (!token) {
                const { line, column } = getLineAndColumn(content, index);
                return {
                    valid: false,
                    message: `Empty placeholder found at line ${line}:${column}.`
                };
            }

            if (!/^[a-zA-Z0-9_]+$/.test(token)) {
                const { line, column } = getLineAndColumn(content, index);
                return {
                    valid: false,
                    message: `Invalid placeholder '${token}' at line ${line}:${column}. Use letters, numbers, or underscores only.`
                };
            }

            if (Array.isArray(allowedPlaceholders) && allowedPlaceholders.length && !allowedPlaceholders.includes(token)) {
                const { line, column } = getLineAndColumn(content, index);
                return {
                    valid: false,
                    message: `Unknown placeholder '${token}' at line ${line}:${column}. Supported placeholders: ${getSupportedPlaceholderTokens(allowedPlaceholders).join(', ')}.`
                };
            }

            index = closingIndex + 1;
            continue;
        }

        if (currentPair === '}}') {
            const { line, column } = getLineAndColumn(content, index);
            return {
                valid: false,
                message: `Unexpected '}}' at line ${line}:${column}.`
            };
        }
    }

    return { valid: true };
};

export const resolveTemplate = (template, data) => normalizeTemplatePlaceholders(template).replace(PLACEHOLDER_REGEX, (_, key) => data[key] ?? '');

export const hasHtmlMarkup = (content) => HTML_TAG_REGEX.test(String(content || ''));

export const escapeHtml = (content) => String(content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stringifyTemplateValue = (value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
};

const isSafeUrl = (value, { allowDataImage = false } = {}) => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return false;

    if (/^(https?:|mailto:|tel:)/i.test(normalizedValue)) return true;
    if (allowDataImage && /^data:image\//i.test(normalizedValue)) return true;
    if (/^(\/|\.\/|\.\.\/|#|\?)/.test(normalizedValue)) return true;

    return !/^[a-z][a-z0-9+.-]*:/i.test(normalizedValue);
};

const sanitizeStyleAttribute = (styleValue) => {
    const declarations = String(styleValue || '')
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean);

    const safeDeclarations = declarations.reduce((accumulator, declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) return accumulator;

        const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
        const value = declaration.slice(separatorIndex + 1).trim();

        if (!property || !/^[a-z-]+$/.test(property)) return accumulator;
        if (property === 'behavior' || property === '-moz-binding') return accumulator;
        if (!value || UNSAFE_STYLE_VALUE_PATTERN.test(value)) return accumulator;

        accumulator.push(`${property}: ${value}`);
        return accumulator;
    }, []);

    return safeDeclarations.join('; ');
};

const sanitizeElementAttributes = (element) => {
    Array.from(element.attributes).forEach((attribute) => {
        const attributeName = attribute.name.toLowerCase();
        const attributeValue = attribute.value;

        if (attributeName.startsWith('on')) {
            element.removeAttribute(attribute.name);
            return;
        }

        const isAllowedAttribute = ALLOWED_HTML_ATTRIBUTES.has(attributeName)
            || attributeName.startsWith('aria-')
            || attributeName.startsWith('data-');

        if (!isAllowedAttribute) {
            element.removeAttribute(attribute.name);
            return;
        }

        if (attributeName === 'style') {
            const safeStyle = sanitizeStyleAttribute(attributeValue);
            if (safeStyle) {
                element.setAttribute('style', safeStyle);
            } else {
                element.removeAttribute(attribute.name);
            }
            return;
        }

        if (attributeName === 'href') {
            if (!isSafeUrl(attributeValue)) {
                element.removeAttribute(attribute.name);
                return;
            }

            if (element.getAttribute('target') === '_blank') {
                element.setAttribute('rel', 'noopener noreferrer');
            }
            return;
        }

        if (attributeName === 'src') {
            if (!isSafeUrl(attributeValue, { allowDataImage: element.tagName.toLowerCase() === 'img' })) {
                element.removeAttribute(attribute.name);
            }
            return;
        }

        if (attributeName === 'target' && !['_blank', '_self'].includes(attributeValue)) {
            element.removeAttribute(attribute.name);
        }
    });
};

const sanitizeNodeTree = (node) => {
    Array.from(node.childNodes).forEach((childNode) => {
        if (childNode.nodeType === Node.COMMENT_NODE) {
            childNode.remove();
            return;
        }

        if (childNode.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const tagName = childNode.tagName.toLowerCase();

        if (STRIP_WITH_CONTENT_TAGS.has(tagName)) {
            childNode.remove();
            return;
        }

        if (!ALLOWED_HTML_TAGS.has(tagName)) {
            childNode.replaceWith(...Array.from(childNode.childNodes));
            return;
        }

        sanitizeElementAttributes(childNode);
        sanitizeNodeTree(childNode);
    });
};

export const sanitizeTemplateHtml = (content) => {
    const html = String(content || '');
    if (!html.trim()) return '';

    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return html
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
    }

    const parser = new DOMParser();
    const documentFragment = parser.parseFromString(html, 'text/html');
    sanitizeNodeTree(documentFragment.body);
    return documentFragment.body.innerHTML;
};

const resolveTemplateForHtml = (template, data, trustedHtmlPlaceholders = TRUSTED_HTML_PLACEHOLDERS) => (
    normalizeTemplatePlaceholders(template).replace(PLACEHOLDER_REGEX, (_, key) => {
        const rawValue = stringifyTemplateValue(data[key]);

        if (trustedHtmlPlaceholders.has(key)) {
            return rawValue;
        }

        return escapeHtml(rawValue);
    })
);

export const formatTemplateBodyAsHtml = (content) => {
    const body = String(content || '');
    if (!body.trim()) return '';
    if (hasHtmlMarkup(body)) return sanitizeTemplateHtml(body);

    return `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6;">${escapeHtml(body)}</div>`;
};

export const renderTemplateBody = (template, data) => formatTemplateBodyAsHtml(resolveTemplateForHtml(template, data));
