"""Map language-specific POS tags to Universal Dependencies UPOS."""

from __future__ import annotations

# Jieba posseg -> UPOS
JIEBA_TO_UPOS: dict[str, str] = {
    "n": "NOUN",
    "nr": "PROPN",
    "nr1": "PROPN",
    "nr2": "PROPN",
    "nrj": "PROPN",
    "nrf": "PROPN",
    "ns": "PROPN",
    "nt": "PROPN",
    "nz": "PROPN",
    "nl": "NOUN",
    "ng": "NOUN",
    "t": "NOUN",
    "tg": "NOUN",
    "s": "NOUN",
    "f": "NOUN",
    "v": "VERB",
    "vd": "VERB",
    "vn": "NOUN",
    "vshi": "VERB",
    "vyou": "VERB",
    "vf": "VERB",
    "vx": "AUX",
    "vi": "VERB",
    "vl": "VERB",
    "vg": "VERB",
    "a": "ADJ",
    "ad": "ADV",
    "an": "NOUN",
    "ag": "ADJ",
    "al": "ADJ",
    "b": "ADJ",
    "bl": "ADJ",
    "z": "ADJ",
    "r": "PRON",
    "rr": "PRON",
    "rz": "PRON",
    "rzt": "PRON",
    "rzs": "PRON",
    "rzv": "PRON",
    "rg": "PRON",
    "m": "NUM",
    "mq": "NUM",
    "q": "NOUN",
    "qv": "ADV",
    "qt": "NOUN",
    "d": "ADV",
    "df": "ADV",
    "dg": "ADV",
    "p": "ADP",
    "pba": "ADP",
    "pbei": "ADP",
    "c": "CCONJ",
    "cc": "CCONJ",
    "u": "PART",
    "uzhe": "PART",
    "ule": "PART",
    "uguo": "PART",
    "ude1": "PART",
    "ude2": "PART",
    "ude3": "PART",
    "usuo": "PART",
    "udeng": "PART",
    "uyy": "PART",
    "udh": "PART",
    "uls": "PART",
    "uzhi": "PART",
    "ulian": "PART",
    "e": "INTJ",
    "y": "PART",
    "o": "INTJ",
    "h": "PART",
    "k": "PART",
    "x": "X",
    "xx": "X",
    "xu": "X",
    "w": "PUNCT",
    "wkz": "PUNCT",
    "wky": "PUNCT",
    "wyz": "PUNCT",
    "wyy": "PUNCT",
    "wj": "PUNCT",
    "ww": "PUNCT",
    "wt": "PUNCT",
    "wd": "PUNCT",
    "wf": "PUNCT",
    "wn": "PUNCT",
    "wm": "PUNCT",
    "ws": "PUNCT",
    "wp": "PUNCT",
    "wb": "PUNCT",
    "wh": "PUNCT",
    "i": "X",
    "j": "NOUN",
    "l": "X",
    "eng": "X",
}

# Sudachi POS (first element of pos tuple) -> UPOS
SUDACHI_TO_UPOS: dict[str, str] = {
    "名詞": "NOUN",
    "固有名詞": "PROPN",
    "代名詞": "PRON",
    "動詞": "VERB",
    "形容詞": "ADJ",
    "形状詞": "ADJ",
    "副詞": "ADV",
    "連体詞": "DET",
    "接続詞": "CCONJ",
    "感動詞": "INTJ",
    "助詞": "PART",
    "助動詞": "AUX",
    "補助記号": "PUNCT",
    "記号": "SYM",
    "接頭辞": "PART",
    "接尾辞": "PART",
    "空白": "X",
    "フィラー": "INTJ",
    "その他": "X",
}

# UI aliases (Chinese / Japanese) -> UPOS
POS_ALIASES: dict[str, str] = {
    "名词": "NOUN",
    "名詞": "NOUN",
    "noun": "NOUN",
    "n": "NOUN",
    "动词": "VERB",
    "動詞": "VERB",
    "verb": "VERB",
    "v": "VERB",
    "形容词": "ADJ",
    "形容詞": "ADJ",
    "adj": "ADJ",
    "副词": "ADV",
    "副詞": "ADV",
    "adv": "ADV",
    "助词": "PART",
    "助詞": "PART",
    "particle": "PART",
    "代词": "PRON",
    "代名詞": "PRON",
    "pron": "PRON",
    "数词": "NUM",
    "数詞": "NUM",
    "num": "NUM",
    "专有名词": "PROPN",
    "固有名詞": "PROPN",
    "propn": "PROPN",
    "标点": "PUNCT",
    "補助記号": "PUNCT",
    "punct": "PUNCT",
    "助动词": "AUX",
    "助動詞": "AUX",
    "aux": "AUX",
    "连词": "CCONJ",
    "接続詞": "CCONJ",
    "cconj": "CCONJ",
    "介词": "ADP",
    "adp": "ADP",
    "感叹词": "INTJ",
    "感動詞": "INTJ",
    "intj": "INTJ",
    "限定词": "DET",
    "連体詞": "DET",
    "det": "DET",
}


def jieba_to_upos(tag: str) -> str:
    tag = (tag or "").lower()
    if tag in JIEBA_TO_UPOS:
        return JIEBA_TO_UPOS[tag]
    # try prefix (e.g. nrfg)
    for key, upos in JIEBA_TO_UPOS.items():
        if tag.startswith(key):
            return upos
    return "X"


def sudachi_to_upos(pos0: str, pos1: str = "") -> str:
    if pos0 == "名詞" and pos1 == "固有名詞":
        return "PROPN"
    if pos0 in SUDACHI_TO_UPOS:
        return SUDACHI_TO_UPOS[pos0]
    return "X"


def alias_to_upos(label: str) -> str | None:
    key = label.strip()
    if not key:
        return None
    upper = key.upper()
    valid = {
        "NOUN",
        "VERB",
        "ADJ",
        "ADV",
        "PRON",
        "DET",
        "ADP",
        "PART",
        "NUM",
        "PROPN",
        "PUNCT",
        "AUX",
        "CCONJ",
        "SCONJ",
        "INTJ",
        "SYM",
        "X",
    }
    if upper in valid:
        return upper
    return POS_ALIASES.get(key) or POS_ALIASES.get(key.lower())
