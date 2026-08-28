# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json


@allow_storage
class Listing:
    seller: Address
    title: str
    description: str
    floor_price: u256
    current_price: u256
    supply: u256
    max_per_wallet: u256
    sold: u256
    cycles_run: u256
    active: bool

    def __init__(self, seller: Address, title: str, description: str,
                 floor_price: u256, supply: u256, max_per_wallet: u256):
        self.seller = seller
        self.title = title
        self.description = description
        self.floor_price = floor_price
        self.current_price = floor_price
        self.supply = supply
        self.max_per_wallet = max_per_wallet
        self.sold = u256(0)
        self.cycles_run = u256(0)
        self.active = True


class DriftMarket(gl.Contract):
    listings: DynArray[Listing]
    wallet_purchases: TreeMap[str, u256]

    def __init__(self):
        pass

    @gl.public.write.payable
    def create_listing(self, title: str, description: str,
                        floor_price: u256, supply: u256,
                        max_per_wallet: u256) -> u256:
        # max_per_wallet = 0 means unlimited (matches "blank = unlimited" spec)
        if floor_price <= u256(0):
            raise Exception("floor_price must be > 0")
        if supply <= u256(0):
            raise Exception("supply must be > 0")
        listing = Listing(gl.message.sender_address, title, description,
                           floor_price, supply, max_per_wallet)
        self.listings.append(listing)
        return u256(len(self.listings) - 1)

    @gl.public.write.payable
    def buy(self, listing_id: u256, quantity: u256) -> None:
        listing = self.listings[listing_id]
        if quantity <= u256(0):
            raise Exception("quantity must be > 0")
        if not listing.active:
            raise Exception("listing is not active")
        if listing.sold + quantity > listing.supply:
            raise Exception("not enough supply remaining")

        wallet_key = f"{int(listing_id)}:{gl.message.sender_address.as_hex}"
        already_bought = self.wallet_purchases.get(wallet_key, u256(0))
        if listing.max_per_wallet > u256(0):
            if already_bought + quantity > listing.max_per_wallet:
                raise Exception("exceeds max per wallet for this listing")

        total_cost = listing.current_price * quantity
        if gl.message.value < total_cost:
            raise Exception("insufficient payment for current price")

        listing.sold += quantity
        if listing.sold >= listing.supply:
            listing.active = False
        self.wallet_purchases[wallet_key] = already_bought + quantity

        gl.evm.emit_transfer(listing.seller, total_cost)
        overpaid = gl.message.value - total_cost
        if overpaid > u256(0):
            gl.evm.emit_transfer(gl.message.sender_address, overpaid)

    @gl.public.write
    def delist(self, listing_id: u256) -> None:
        listing = self.listings[listing_id]
        if listing.seller != gl.message.sender_address:
            raise Exception("only the seller can delist")
        listing.active = False

    @gl.public.write
    def run_agent_cycle(self, listing_id: u256) -> str:
        listing = self.listings[listing_id]
        if not listing.active:
            raise Exception("listing is not active")

        pct_sold = (int(listing.sold) * 100) // int(listing.supply)

        prompt = f"""
You price NFTs for a marketplace. Judge how much the price should drift
this cycle, as a percentage between -15 and +20.

Listing title: {listing.title}
Description: {listing.description}
Floor price: {listing.floor_price}
Current price: {listing.current_price}
Percent of supply sold so far: {pct_sold}%
Cycles listed so far: {listing.cycles_run}

Strong demand should push toward +20%. Weak demand or long time unsold
should push toward -15%. No signal means 0%.

Respond ONLY with JSON: {{"adjustment_percent": <int -15..20>, "reasoning": "<one sentence>"}}
"""

        def get_adjustment() -> str:
            res = gl.nondet.exec_prompt(prompt)
            res = res.replace("```json", "").replace("```", "").strip()
            data = json.loads(res)
            pct = max(-15, min(20, int(data["adjustment_percent"])))
            return json.dumps({"adjustment_percent": pct})

        result = gl.eq_principle.prompt_comparative(
            get_adjustment,
            principle="The adjustment_percent values should not differ by more than 5 percentage points.",
        )

        data = json.loads(result)
        pct = int(data["adjustment_percent"])
        new_price = int(listing.current_price) + (int(listing.current_price) * pct) // 100
        new_price = max(new_price, int(listing.floor_price))
        listing.current_price = u256(new_price)
        listing.cycles_run += u256(1)
        return result

    @gl.public.view
    def get_listing(self, listing_id: u256) -> dict:
        listing = self.listings[listing_id]
        return {
            "seller": listing.seller.as_hex,
            "title": listing.title,
            "description": listing.description,
            "floor_price": listing.floor_price,
            "current_price": listing.current_price,
            "supply": listing.supply,
            "max_per_wallet": listing.max_per_wallet,
            "sold": listing.sold,
            "cycles_run": listing.cycles_run,
            "active": listing.active,
        }

    @gl.public.view
    def wallet_purchase_count(self, listing_id: u256, wallet: str) -> u256:
        wallet_key = f"{int(listing_id)}:{wallet.lower()}"
        return self.wallet_purchases.get(wallet_key, u256(0))

    @gl.public.view
    def total_listings(self) -> u256:
        return u256(len(self.listings))