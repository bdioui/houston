"""Regroupement des lignes SIFAC par flux.

Port de `frontend/src/lib/sifac/aggregate.ts`. Fonction pure.

L'agrégat est taillé pour ressembler à une `finance.Expanse` : les montants
s'additionnent, les dates sont bornées (min pour l'engagement, max pour le
paiement), et le statut se déduit des écritures — jamais d'une colonne, SIFAC
n'en fournit pas.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

# Tolérance de comparaison payé ≈ facturé. Le TypeScript arrondissait chaque
# somme au centime parce qu'un total de flottants nul ressort à 1e-13 ; en
# Decimal l'addition est exacte et l'arrondi défensif a disparu. Le seuil
# subsiste, mais pour une autre raison : un écart d'un centime entre le payé et
# le facturé est un arrondi de TVA côté SIFAC, pas un reste à payer.
#
# Comparaison large (`<=`), là où le TypeScript écrivait `< 0.01`. Ce n'est pas
# un écart avec l'original mais sa correction : en flottants,
# `Math.abs(2000 - 1999.99)` vaut 0.00999…, donc un écart d'un centime passait
# déjà sous le seuil strict. Le bruit de calcul implémentait l'intention. En
# Decimal l'écart vaut exactement 0.01, et `<` le rejetterait — une commande
# soldée au centime près retomberait en « Livré ».
PAYMENT_TOLERANCE = Decimal("0.01")

ZERO = Decimal("0.00")


@dataclass(frozen=True)
class FluxAggregate:
    flux_id: str
    pfi: str
    title: str
    supplier_name: str
    supplier_code: str
    account: str
    account_label: str
    otp: str
    status: str  # 'Engagé' | 'Livré' | 'Payé'
    amount: Decimal
    amount_engaged: Decimal
    amount_invoiced: Decimal
    amount_paid: Decimal
    amount_report: Decimal
    purchase_date: date | None
    invoice_date: date | None
    payment_date: date | None
    delivery_date: date | None
    line_count: int
    category: str


def sifac_category(code: str) -> str:
    """Le compte d'exécution budgétaire SIFAC ne connaît que trois valeurs. Tout
    ce qui n'est ni FG ni IG relève de la masse salariale, y compris les
    écritures de paie qui ne portent pas de code du tout.
    """
    if code == "FG":
        return "Fonctionnement"
    if code == "IG":
        return "Investissement"
    return "Personnel"


def _first_non_empty(lines: list[dict], key: str) -> str:
    for line in lines:
        v = line.get(key)
        if isinstance(v, str) and v != "":
            return v
    return ""


def _bound_date(lines: list[dict], key: str, pick: str) -> date | None:
    dates = [line[key] for line in lines if line.get(key) is not None]
    if not dates:
        return None
    return min(dates) if pick == "min" else max(dates)


def _resolve_status(lines: list[dict], invoiced: Decimal, paid: Decimal) -> str:
    """Une commande peut être facturée puis intégralement avoirée : le net
    retombe à zéro alors que des paiements ont bien eu lieu. Le statut se décide
    donc sur l'existence d'écritures, pas sur le signe des totaux.
    """
    has_invoice = any(
        line["invoice_number"] != "" or line["amount_invoiced"] != ZERO
        for line in lines
    )
    has_payment = any(
        line["payment_date"] is not None or line["amount_paid"] != ZERO
        for line in lines
    )

    if not has_invoice and not has_payment:
        return "Engagé"
    if has_payment and abs(paid - invoiced) <= PAYMENT_TOLERANCE:
        return "Payé"
    if invoiced > ZERO:
        return "Livré"
    return "Engagé"


def _aggregate_flux(flux_id: str, lines: list[dict]) -> FluxAggregate:
    def total(key: str) -> Decimal:
        return sum((line[key] for line in lines), ZERO)

    amount_engaged = total("amount_engaged")
    amount_invoiced = total("amount_invoiced")
    amount_paid = total("amount_paid")
    status = _resolve_status(lines, amount_invoiced, amount_paid)

    # Le montant affiché est celui de l'état atteint : une commande soldée vaut
    # ce qui a été payé, pas ce qui avait été engagé.
    amount = (
        amount_paid if status == "Payé"
        else amount_invoiced if status == "Livré"
        else amount_engaged
    )

    return FluxAggregate(
        flux_id=flux_id,
        pfi=_first_non_empty(lines, "pfi"),
        title=_first_non_empty(lines, "flux_label"),
        supplier_name=_first_non_empty(lines, "supplier_name"),
        supplier_code=_first_non_empty(lines, "supplier_code"),
        account=_first_non_empty(lines, "account"),
        account_label=_first_non_empty(lines, "account_label"),
        otp=_first_non_empty(lines, "otp"),
        status=status,
        amount=amount,
        amount_engaged=amount_engaged,
        amount_invoiced=amount_invoiced,
        amount_paid=amount_paid,
        amount_report=total("amount_report"),
        purchase_date=_bound_date(lines, "engagement_date", "min"),
        invoice_date=_bound_date(lines, "invoice_date", "max"),
        payment_date=_bound_date(lines, "payment_date", "max"),
        delivery_date=_bound_date(lines, "csf_date", "max"),
        line_count=len(lines),
        category=sifac_category(_first_non_empty(lines, "category")),
    )


def aggregate_by_flux(lines: list[dict]) -> list[FluxAggregate]:
    """Regroupe toutes les lignes fournies, tous exercices confondus : un flux
    engagé en 2025 et reporté en 2026 ne doit produire qu'une seule dépense.
    """
    groups: dict[str, list[dict]] = {}
    for line in lines:
        flux_id = line["flux_id"]
        if flux_id == "":
            continue
        groups.setdefault(flux_id, []).append(line)
    return [_aggregate_flux(flux_id, group) for flux_id, group in groups.items()]
