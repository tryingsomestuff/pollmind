# 🔍 Mecanisme de cotation LMSR de PollMind

PollMind utilise maintenant un market maker **LMSR** (Logarithmic Market Scoring Rule) multi-options. Les pourcentages affiches dans l'interface sont donc de vraies probabilites normalisees au sens du modele : elles somment toujours a `100 %` pour une question donnee.

## 1. Etat du marche

Pour une question avec `n` options, on note :

- `q_i` : le nombre total de shares outstanding sur l'option `i`
- `q = (q_1, ..., q_n)` : l'etat courant du marche
- `b` : le parametre de liquidite (`questions.liquidity_param`, valeur par defaut `50`)

Le systeme n'affiche pas un prix arbitraire par option. Il derive les probabilites a partir de l'etat global `q`.

## 2. Fonction de cout LMSR

La fonction de cout du marche est :

$$
C(q) = b \ln\left(\sum_{i=1}^{n} e^{q_i / b}\right)
$$

Cette fonction a plusieurs proprietes utiles :

- elle est convexe ;
- elle fournit un cout marginal croissant quand une option devient dominante ;
- elle borne la perte maximale theorique du market maker.

La borne de perte maximale vaut :

$$
	ext{loss}_{max} = b \ln(n)
$$

Exemples avec `b = 50` :

- 2 options : `50 ln(2) ≈ 34.66`
- 3 options : `50 ln(3) ≈ 54.93`
- 4 options : `50 ln(4) ≈ 69.31`

## 3. Probabilites affichees

La probabilite de l'option `i` est le gradient de la fonction de cout :

$$
p_i(q) = \frac{e^{q_i / b}}{\sum_{j=1}^{n} e^{q_j / b}}
$$

On a automatiquement :

$$
\sum_{i=1}^{n} p_i(q) = 1
$$

Donc, dans PollMind :

- si une option monte, au moins une autre baisse ;
- les pourcentages restent coherents meme avec 3, 4 ou 5 reponses ;
- les probabilites ne peuvent jamais depasser `100 %` au total.

## 4. Comment une mise est transformee en shares

Quand un utilisateur depense un montant `x` sur l'option `k`, le serveur ne fait pas `shares = x / prix_courant` comme dans l'ancien modele. Il cherche une quantite `\Delta q` telle que :

$$
C(q + \Delta q \cdot e_k) - C(q) = x
$$

ou `e_k` est le vecteur unitaire de l'option `k`.

En pratique, PollMind resout cette equation par recherche binaire :

1. calcul du cout courant `C(q)` ;
2. simulation d'un ajout de shares sur l'option cible ;
3. ajustement iteratif de `\Delta q` jusqu'a ce que l'ecart de cout soit egal au montant depense.

Consequence :

- plus une option est deja achetee, moins un meme montant achete de shares supplementaires ;
- le prix moyen paye sur une transaction est superieur ou egal au cout marginal initial ;
- la courbe de prix est lisse et sans seuil artificiel.

## 5. Exemple chiffre a 3 options

Prenons une question a 3 options avec `b = 50` et un marche initial :

$$
q = (0, 0, 0)
$$

Alors :

$$
p_1 = p_2 = p_3 = \frac{1}{3}
$$

Supposons qu'un utilisateur depense `10` points sur l'option 1.

Le systeme cherche `\Delta q` tel que :

$$
50 \ln\left(e^{\Delta q/50} + 1 + 1\right) - 50 \ln(3) = 10
$$

En resolvant :

$$
e^{\Delta q/50} = 3e^{0.2} - 2 \approx 1.6642
$$

Donc :

$$
\Delta q \approx 50 \ln(1.6642) \approx 25.46
$$

Le parieur recoit donc environ `25.46` shares.

Les nouvelles probabilites deviennent :

$$
p_1 = \frac{1.6642}{1.6642 + 1 + 1} \approx 45.40\%
$$

$$
p_2 = p_3 = \frac{1}{3.6642} \approx 27.30\%
$$

La somme vaut bien `100 %`.

## 6. Effet du parametre de liquidite `b`

Le parametre `b` controle la sensibilite du marche :

- **petit `b`** : le marche bouge vite, les probabilites changent fortement pour des mises modestes ;
- **grand `b`** : le marche est plus profond, il faut des mises plus importantes pour le deplacer.

Intuition utile :

- `b` faible = plus reactif, plus volatil ;
- `b` eleve = plus stable, plus conservateur.

Avec la valeur actuelle `b = 50`, PollMind reste assez reactif tout en evitant les sauts trop brutaux sur les petites questions internes.

## 7. Regle de payout a la resolution

La resolution est maintenant simple :

- si votre option gagne, chaque share vaut `1` point ;
- si vous detenez `s` shares gagnantes, votre payout vaut `s` ;
- si votre option perd, votre payout vaut `0`.

Autrement dit :

$$
	ext{payout} =
\begin{cases}
s & \text{si l'option est correcte} \\
0 & \text{sinon}
\end{cases}
$$

Le profit net d'une mise de montant `x` qui a achete `s` shares est donc :

$$
	ext{profit} = s - x
$$

Ce modele est different de l'ancien systeme de redistribution proportionnelle d'un pool. Le payout depend maintenant uniquement du nombre de shares detenues sur la bonne reponse.

## 8. Pourquoi ce modele est meilleur que l'ancien

L'ancien modele utilisait des prix independants par option. Il etait simple, mais mathematiquement incoherent pour une question multi-reponses.

Le LMSR corrige cela :

- les probabilites sont normalisees ;
- le marche fonctionne de la meme maniere avec 2 ou 6 options ;
- le cout d'une transaction depend du deplacement reel du marche ;
- le risque theorique du market maker est borne.

## 9. Lecture correcte des pourcentages dans PollMind

Les pourcentages affiches dans l'application doivent etre lus comme :

- l'etat instantane du consensus du marche ;
- pas une verite objective ;
- une probabilite implicite issue des positions deja achetees.

En pratique, cela signifie qu'une option a `62 %` est simplement celle que le marche considere actuellement comme la plus probable, compte tenu des mises deja engagees.
