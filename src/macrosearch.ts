
import { existsSync } from 'fs';
import * as path from 'path';

const rsbankMacroDirs = [
    '../obj',
    'cb',
    'dlng',
    'dlng/forex',
    'dlng/mmark',
    'dlng/testmac',
    'dlng/secur',
    'dlng/secur/replication',
    'report',
    'ps',
    'rm',
    'reptreg',
    'invh',
    'mbr',
    'dlng/depo',
    'dlng/veksel',
    'dlng/netting',
    'dlng/va',
    'dlng/dv',
    'dlng/trust',
    'loans/crd',
    'loans/util',
    'depositr',
    'sbdesk',
    'od',
    'util',
    'exchange',
    'conv_fc',
    'book',
    'kkm',
    'tcd',
    'spcard',
    'updsysfl',
    'cells',
    'replic',
    'acquirer',
    'rsgate_r20',
    'loans/depo',
    'reptreg/reportbase',
    'reptreg/cash',
    'reptreg/601',
    'reptreg/opu',
    'report/balance',
    'report/common',
    'reptreg/110',
    'rtgroupproc',
    'reptreg/115',
    'reptreg/155',
    'reptreg/301',
    'rtmontrans',
    'reptreg/118',
    'reptreg/603',
    'reptreg/for',
    'reptReg/125',
    'report/balance/nat',
    'reptReg/134',
    'reptReg/129',
    'Loans/SERVICE',
    'reptReg/664',
    'reptreg/345',
    'reptreg/balance',
    'reptreg/652',
    'reptreg/901',
    'LC',
    'SPCARD/UCS',
    'reptreg/123',
    'reptreg/Appendix6',
    'WebServices',
    'reptreg/250',
    'Loans/External',
    'dlng/uniloader',
    'reptreg/web',
    'Loans/WebLoans',
    'Loans/WebLoans/fmt',
    'Web/Core',
    'reptreg/303',
    'TWIM',
    'reptreg/ofr',
    'reptreg/119',
    'depositr/gs',
    'Loans/WebLoans/ClaimRoute',
    'reptreg/127',
    'Loans/WebLoans/DataDirectory',
    'dlng/ir',
    'report/web',
    'report/web/constructor',
    'Jr',
    'reptreg/410',
    'reptreg/302',
    'reptreg/401',
    'Report/AccountStatement',
    'reptreg/310',
    'reptreg/501',
    'reptreg/For_753P',
    'reptreg/634',
    'Loans/CRD/Limit',
];
const rsbankInters = [
    'MmarkInter',
    'FXInter',

    'LoansFind',
    'LoansGlobalData',
    'LoansGUI',
    'LoansList',
    'SbCrdInter',
    'ПроцентыБухгалтер',


];

function getMacDir(path: string): string {
    let matches = path.match(/^(.*[\\/]mac)([\\/]|$)/i);
    if (matches !== null) {
        return matches[1];
    }
    return null;
}

function isRsbank(rootDir: string): boolean {
    return path.basename(rootDir).toLowerCase() == 'mac';
}

export function searchMacrofile(currentFileDir: string, macro: string): string {
    let basepath: string;
    let hasExtension: boolean = macro.endsWith(".mac");
    let rootDir = getMacDir(currentFileDir) || currentFileDir;
    let searchDirs = isRsbank(rootDir) ? rsbankMacroDirs : [''];
    for (const dir of searchDirs) {
        if (dir.length) {
            basepath = rootDir + path.sep + dir + path.sep + macro;
        } else {
            basepath = rootDir + path.sep + macro;
        }

        let extensions = hasExtension ? [''] : ['.mac', '.d32'];
        for (const ext of extensions) {
            let fullpath = basepath + ext
            if (existsSync(fullpath)) {
                return fullpath;
            }
        }
    };
    return '';
}

