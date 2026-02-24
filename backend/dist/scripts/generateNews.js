"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const NEWS_DIR = path.resolve(__dirname, "../../prisma/news");
const parseArgs = () => {
    const args = process.argv.slice(2);
    let title = "";
    let content = "";
    let version = "";
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--title" && args[i + 1]) {
            title = args[++i];
        }
        else if (args[i] === "--content" && args[i + 1]) {
            content = args[++i];
        }
        else if (args[i] === "--version" && args[i + 1]) {
            version = args[++i];
        }
    }
    if (!title || !content || !version) {
        return null;
    }
    return { title, content, version, publishedAt: new Date().toISOString() };
};
const main = () => {
    const params = parseArgs();
    if (!params) {
        console.error('Использование: npm run news:generate -- --title "Заголовок" --content "Текст" --version "2026-02-22"');
        process.exit(1);
    }
    if (!fs.existsSync(NEWS_DIR)) {
        fs.mkdirSync(NEWS_DIR, { recursive: true });
    }
    const filePath = path.join(NEWS_DIR, `${params.version}.json`);
    if (fs.existsSync(filePath)) {
        console.log(`Новость для версии "${params.version}" уже существует: ${filePath}`);
        return;
    }
    fs.writeFileSync(filePath, JSON.stringify(params, null, 2) + "\n");
    console.log(`Новость сохранена: ${filePath}`);
};
main();
//# sourceMappingURL=generateNews.js.map