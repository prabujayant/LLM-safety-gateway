# backend/ppa.py
import random
from typing import Tuple


PPA_TEMPLATES = [
    "### SYSTEM GUARD ###\nUserQuery:\n{prompt}\n### END GUARD ###",
    "<SAFE_REQUEST>\n{prompt}\n</SAFE_REQUEST>",
    "«BEGIN_USER_PROMPT» {prompt} «END_USER_PROMPT»",
    "---- SANITIZED INPUT START ----\n{prompt}\n---- SANITIZED INPUT END ----",
    "[PROMPT-BEGIN]\n{prompt}\n[PROMPT-END]",
    "⟦USER_CONTENT⟧ {prompt} ⟦/USER_CONTENT⟧",
    "(((CLEAN_PROMPT))): {prompt} :::",
    "---BLOCK-A---\n{prompt}\n---BLOCK-B---",
    "SAFE_PREFIX::: {prompt} :::SAFE_SUFFIX",
    "<<<U>>> {prompt} <<<END>>>",
    "::INPUT:: {prompt} ::/INPUT::",
    "<P>{prompt}</P>",
]

def wrap_prompt(prompt: str) -> Tuple[str, str]:
    """
    Returns (wrapped_prompt, template_id) for logging/debug.
    """
    template = random.choice(PPA_TEMPLATES)
    wrapped = template.format(prompt=prompt)
    template_id = f"tpl_{PPA_TEMPLATES.index(template)}"
    return wrapped, template_id
