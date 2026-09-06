// Hand-rolled subset of YAML — indentation mappings, "- " sequences,
// inline arrays, quoted/plain scalars, # comments. No anchors, no
// block scalars, no flow mappings. Written this way to avoid pulling
// in js-yaml for a handful of config files. Swap for a real parser if
// config ever needs more than this — don't extend this one.

function stripComment(line) {
    let inS = false;
    let inD = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === "'" && !inD) inS = !inS;
        else if (c === '"' && !inS) inD = !inD;
        else if (c === '#' && !inS && !inD) {
            if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
        }
    }
    return line;
}

function parseScalar(raw) {
    const v = raw.trim();
    if (v === '') return null;
    if (v === '~' || /^null$/i.test(v)) return null;
    if (/^true$/i.test(v)) return true;
    if (/^false$/i.test(v)) return false;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
    }
    if (v.startsWith('[') && v.endsWith(']')) {
        const inner = v.slice(1, -1).trim();
        if (inner === '') return [];
        return inner.split(',').map((s) => parseScalar(s.trim()));
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
}

function splitKeyValue(content) {
    let inS = false;
    let inD = false;
    for (let i = 0; i < content.length; i++) {
        const c = content[i];
        if (c === "'" && !inD) inS = !inS;
        else if (c === '"' && !inS) inD = !inD;
        else if (c === ':' && !inS && !inD) {
            if (i + 1 === content.length || /\s/.test(content[i + 1])) {
                return [content.slice(0, i).trim(), content.slice(i + 1).trim()];
            }
        }
    }
    return null;
}

export function parseYAML(text) {
    const rawLines = String(text).split('\n');
    const lines = [];
    for (const rl of rawLines) {
        const noComment = stripComment(rl);
        if (noComment.trim() === '') continue;
        const indent = noComment.length - noComment.trimStart().length;
        lines.push({ indent, content: noComment.trim() });
    }

    let pos = 0;

    function isSeqLine(l) {
        return l.content === '-' || l.content.startsWith('- ');
    }

    function parseBlock(indent) {
        if (pos >= lines.length) return null;
        return isSeqLine(lines[pos]) ? parseSequence(indent) : parseMapping(indent);
    }

    function parseMapping(indent) {
        const result = {};
        while (pos < lines.length && lines[pos].indent === indent && !isSeqLine(lines[pos])) {
            const { content } = lines[pos];
            const kv = splitKeyValue(content);
            if (!kv) { pos++; continue; }
            const [key, rest] = kv;
            pos++;
            if (rest === '') {
                result[key] = (pos < lines.length && lines[pos].indent > indent)
                    ? parseBlock(lines[pos].indent)
                    : null;
            } else {
                result[key] = parseScalar(rest);
            }
        }
        return result;
    }

    function parseSequence(indent) {
        const result = [];
        while (pos < lines.length && lines[pos].indent === indent && isSeqLine(lines[pos])) {
            const content = lines[pos].content === '-' ? '' : lines[pos].content.slice(2);
            const itemIndent = indent + 4;
            if (content === '') {
                pos++;
                result.push(
                    (pos < lines.length && lines[pos].indent >= itemIndent)
                        ? parseBlock(lines[pos].indent)
                        : null
                );
                continue;
            }
            const kv = splitKeyValue(content);
            if (!kv) {
                result.push(parseScalar(content));
                pos++;
                continue;
            }
            const [key, rest] = kv;
            const obj = {};
            pos++;
            if (rest === '') {
                obj[key] = (pos < lines.length && lines[pos].indent > itemIndent)
                    ? parseBlock(lines[pos].indent)
                    : null;
            } else {
                obj[key] = parseScalar(rest);
            }
            while (pos < lines.length && lines[pos].indent === itemIndent && !isSeqLine(lines[pos])) {
                const kv2 = splitKeyValue(lines[pos].content);
                if (!kv2) { pos++; continue; }
                const [k2, r2] = kv2;
                pos++;
                if (r2 === '') {
                    obj[k2] = (pos < lines.length && lines[pos].indent > itemIndent)
                        ? parseBlock(lines[pos].indent)
                        : null;
                } else {
                    obj[k2] = parseScalar(r2);
                }
            }
            result.push(obj);
        }
        return result;
    }

    pos = 0;
    return parseBlock(0) || {};
}
