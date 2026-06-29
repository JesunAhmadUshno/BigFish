/**
 * Player Data & xG Allocation Engine — V7 Full 48-Team Database
 * 
 * Contains predicted starting lineups and fractional xG weights
 * for all 48 FIFA World Cup 2026 qualified teams.
 * 
 * xG weight methodology:
 * - Based on 2024-2026 club + international goal involvement rates
 * - Forwards: 0.25-0.45, Attacking Midfielders: 0.10-0.25,
 *   Central Midfielders: 0.05-0.15, Defenders: 0.02-0.08
 * - Weights for each team sum to ~1.0
 */

const SQUADS = {
  // ═══════════════ GROUP A ═══════════════
  'Mexico': [
    { name: 'Santiago Gimenez', position: 'ST', xgWeight: 0.35 },
    { name: 'Hirving Lozano', position: 'RW', xgWeight: 0.20 },
    { name: 'Alexis Vega', position: 'LW', xgWeight: 0.15 },
    { name: 'Edson Alvarez', position: 'CDM', xgWeight: 0.08 },
    { name: 'Luis Romo', position: 'CM', xgWeight: 0.07 },
    { name: 'Cesar Montes', position: 'CB', xgWeight: 0.03 },
    { name: 'Jorge Sanchez', position: 'RB', xgWeight: 0.02 },
    { name: 'Johan Vasquez', position: 'CB', xgWeight: 0.02 },
    { name: 'Gerardo Arteaga', position: 'LB', xgWeight: 0.02 },
    { name: 'Luis Chavez', position: 'CM', xgWeight: 0.04 },
    { name: 'Guillermo Ochoa', position: 'GK', xgWeight: 0.00 },
  ],
  'South Africa': [
    { name: 'Percy Tau', position: 'ST', xgWeight: 0.38 },
    { name: 'Themba Zwane', position: 'AM', xgWeight: 0.22 },
    { name: 'Bongokuhle Hlongwane', position: 'LW', xgWeight: 0.15 },
    { name: 'Teboho Mokoena', position: 'CM', xgWeight: 0.10 },
    { name: 'Mothobi Mvala', position: 'CDM', xgWeight: 0.05 },
    { name: 'Ronwen Williams', position: 'GK', xgWeight: 0.00 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'South Korea': [
    { name: 'Son Heung-min', position: 'LW', xgWeight: 0.40 },
    { name: 'Hwang Hee-chan', position: 'ST', xgWeight: 0.22 },
    { name: 'Lee Kang-in', position: 'AM', xgWeight: 0.15 },
    { name: 'Hwang In-beom', position: 'CM', xgWeight: 0.08 },
    { name: 'Kim Min-jae', position: 'CB', xgWeight: 0.05 },
    { name: 'Jung Woo-young', position: 'CDM', xgWeight: 0.04 },
    { name: 'Kim Jin-su', position: 'LB', xgWeight: 0.03 },
    { name: 'Kim Seung-gyu', position: 'GK', xgWeight: 0.00 },
    { name: 'Others', position: 'DEF', xgWeight: 0.03 },
  ],
  'Czech Republic': [
    { name: 'Patrik Schick', position: 'ST', xgWeight: 0.42 },
    { name: 'Adam Hlozek', position: 'LW', xgWeight: 0.18 },
    { name: 'Tomas Soucek', position: 'CM', xgWeight: 0.15 },
    { name: 'Vaclav Cerny', position: 'RW', xgWeight: 0.10 },
    { name: 'Alex Kral', position: 'CDM', xgWeight: 0.05 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Czechia': [
    { name: 'Patrik Schick', position: 'ST', xgWeight: 0.42 },
    { name: 'Adam Hlozek', position: 'LW', xgWeight: 0.18 },
    { name: 'Tomas Soucek', position: 'CM', xgWeight: 0.15 },
    { name: 'Vaclav Cerny', position: 'RW', xgWeight: 0.10 },
    { name: 'Alex Kral', position: 'CDM', xgWeight: 0.05 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],

  // ═══════════════ GROUP B ═══════════════
  'Canada': [
    { name: 'Jonathan David', position: 'ST', xgWeight: 0.38 },
    { name: 'Alphonso Davies', position: 'LW', xgWeight: 0.22 },
    { name: 'Cyle Larin', position: 'ST', xgWeight: 0.15 },
    { name: 'Stephen Eustaquio', position: 'CM', xgWeight: 0.08 },
    { name: 'Tajon Buchanan', position: 'RW', xgWeight: 0.07 },
    { name: 'Ismael Kone', position: 'CM', xgWeight: 0.04 },
    { name: 'Others', position: 'DEF', xgWeight: 0.06 },
  ],
  'Switzerland': [
    { name: 'Breel Embolo', position: 'ST', xgWeight: 0.30 },
    { name: 'Xherdan Shaqiri', position: 'AM', xgWeight: 0.18 },
    { name: 'Ruben Vargas', position: 'LW', xgWeight: 0.15 },
    { name: 'Noah Okafor', position: 'RW', xgWeight: 0.12 },
    { name: 'Granit Xhaka', position: 'CM', xgWeight: 0.10 },
    { name: 'Remo Freuler', position: 'CM', xgWeight: 0.06 },
    { name: 'Manuel Akanji', position: 'CB', xgWeight: 0.04 },
    { name: 'Others', position: 'DEF', xgWeight: 0.05 },
  ],
  'Qatar': [
    { name: 'Almoez Ali', position: 'ST', xgWeight: 0.38 },
    { name: 'Akram Afif', position: 'LW', xgWeight: 0.28 },
    { name: 'Hassan Al-Haydos', position: 'AM', xgWeight: 0.14 },
    { name: 'Abdulaziz Hatem', position: 'CM', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.12 },
  ],
  'Bosnia and Herzegovina': [
    { name: 'Edin Dzeko', position: 'ST', xgWeight: 0.40 },
    { name: 'Ermedin Demirovic', position: 'ST', xgWeight: 0.22 },
    { name: 'Miralem Pjanic', position: 'CM', xgWeight: 0.15 },
    { name: 'Anel Ahmedhodzic', position: 'CB', xgWeight: 0.05 },
    { name: 'Others', position: 'DEF', xgWeight: 0.18 },
  ],

  // ═══════════════ GROUP C ═══════════════
  'Brazil': [
    { name: 'Vinicius Jr', position: 'LW', xgWeight: 0.28 },
    { name: 'Rodrygo', position: 'RW', xgWeight: 0.22 },
    { name: 'Endrick', position: 'ST', xgWeight: 0.18 },
    { name: 'Lucas Paqueta', position: 'AM', xgWeight: 0.12 },
    { name: 'Bruno Guimaraes', position: 'CM', xgWeight: 0.08 },
    { name: 'Marquinhos', position: 'CB', xgWeight: 0.04 },
    { name: 'Gabriel Magalhaes', position: 'CB', xgWeight: 0.03 },
    { name: 'Others', position: 'DEF', xgWeight: 0.05 },
  ],
  'Morocco': [
    { name: 'Youssef En-Nesyri', position: 'ST', xgWeight: 0.32 },
    { name: 'Hakim Ziyech', position: 'RW', xgWeight: 0.22 },
    { name: 'Brahim Diaz', position: 'AM', xgWeight: 0.18 },
    { name: 'Sofiane Boufal', position: 'LW', xgWeight: 0.10 },
    { name: 'Achraf Hakimi', position: 'RB', xgWeight: 0.08 },
    { name: 'Sofyan Amrabat', position: 'CDM', xgWeight: 0.04 },
    { name: 'Others', position: 'DEF', xgWeight: 0.06 },
  ],
  'Haiti': [
    { name: 'Frantzdy Pierrot', position: 'ST', xgWeight: 0.40 },
    { name: 'Duckens Nazon', position: 'ST', xgWeight: 0.28 },
    { name: 'Derrick Etienne Jr', position: 'LW', xgWeight: 0.12 },
    { name: 'Others', position: 'MID/DEF', xgWeight: 0.20 },
  ],
  'Scotland': [
    { name: 'Scott McTominay', position: 'CM', xgWeight: 0.28 },
    { name: 'Che Adams', position: 'ST', xgWeight: 0.25 },
    { name: 'John McGinn', position: 'AM', xgWeight: 0.18 },
    { name: 'Ryan Christie', position: 'RW', xgWeight: 0.10 },
    { name: 'Andy Robertson', position: 'LB', xgWeight: 0.07 },
    { name: 'Others', position: 'DEF', xgWeight: 0.12 },
  ],

  // ═══════════════ GROUP D ═══════════════
  'USA': [
    { name: 'Christian Pulisic', position: 'LW', xgWeight: 0.30 },
    { name: 'Ricardo Pepi', position: 'ST', xgWeight: 0.25 },
    { name: 'Gio Reyna', position: 'AM', xgWeight: 0.15 },
    { name: 'Weston McKennie', position: 'CM', xgWeight: 0.10 },
    { name: 'Timothy Weah', position: 'RW', xgWeight: 0.08 },
    { name: 'Sergino Dest', position: 'RB', xgWeight: 0.04 },
    { name: 'Others', position: 'DEF', xgWeight: 0.08 },
  ],
  'Paraguay': [
    { name: 'Antonio Sanabria', position: 'ST', xgWeight: 0.35 },
    { name: 'Miguel Almiron', position: 'RW', xgWeight: 0.25 },
    { name: 'Julio Enciso', position: 'LW', xgWeight: 0.18 },
    { name: 'Matias Villasanti', position: 'CM', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.14 },
  ],
  'Australia': [
    { name: 'Mitchell Duke', position: 'ST', xgWeight: 0.32 },
    { name: 'Mathew Leckie', position: 'RW', xgWeight: 0.20 },
    { name: 'Riley McGree', position: 'AM', xgWeight: 0.15 },
    { name: 'Jackson Irvine', position: 'CM', xgWeight: 0.10 },
    { name: 'Aaron Mooy', position: 'CM', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ],
  'Turkiye': [
    { name: 'Arda Guler', position: 'AM', xgWeight: 0.30 },
    { name: 'Kerem Akturkoglu', position: 'LW', xgWeight: 0.22 },
    { name: 'Cenk Tosun', position: 'ST', xgWeight: 0.18 },
    { name: 'Hakan Calhanoglu', position: 'CM', xgWeight: 0.15 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ],

  // ═══════════════ GROUP E ═══════════════
  'Germany': [
    { name: 'Florian Wirtz', position: 'AM', xgWeight: 0.28 },
    { name: 'Jamal Musiala', position: 'AM', xgWeight: 0.25 },
    { name: 'Kai Havertz', position: 'ST', xgWeight: 0.20 },
    { name: 'Leroy Sane', position: 'RW', xgWeight: 0.12 },
    { name: 'Toni Kroos', position: 'CM', xgWeight: 0.05 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Curacao': [
    { name: 'Rangelo Janga', position: 'ST', xgWeight: 0.40 },
    { name: 'Juninho Bacuna', position: 'AM', xgWeight: 0.25 },
    { name: 'Kenji Gorre', position: 'LW', xgWeight: 0.15 },
    { name: 'Others', position: 'MID/DEF', xgWeight: 0.20 },
  ],
  'Ivory Coast': [
    { name: 'Sebastien Haller', position: 'ST', xgWeight: 0.32 },
    { name: 'Nicolas Pepe', position: 'RW', xgWeight: 0.22 },
    { name: 'Franck Kessie', position: 'CM', xgWeight: 0.15 },
    { name: 'Simon Adingra', position: 'LW', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.19 },
  ],
  'Ecuador': [
    { name: 'Enner Valencia', position: 'ST', xgWeight: 0.38 },
    { name: 'Gonzalo Plata', position: 'RW', xgWeight: 0.20 },
    { name: 'Moises Caicedo', position: 'CM', xgWeight: 0.15 },
    { name: 'Jeremy Sarmiento', position: 'LW', xgWeight: 0.10 },
    { name: 'Others', position: 'DEF', xgWeight: 0.17 },
  ],

  // ═══════════════ GROUP F ═══════════════
  'Netherlands': [
    { name: 'Cody Gakpo', position: 'LW', xgWeight: 0.28 },
    { name: 'Memphis Depay', position: 'ST', xgWeight: 0.25 },
    { name: 'Xavi Simons', position: 'AM', xgWeight: 0.18 },
    { name: 'Donyell Malen', position: 'RW', xgWeight: 0.12 },
    { name: 'Virgil van Dijk', position: 'CB', xgWeight: 0.07 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Japan': [
    { name: 'Takefusa Kubo', position: 'RW', xgWeight: 0.25 },
    { name: 'Kaoru Mitoma', position: 'LW', xgWeight: 0.22 },
    { name: 'Ayase Ueda', position: 'ST', xgWeight: 0.20 },
    { name: 'Junya Ito', position: 'RW', xgWeight: 0.12 },
    { name: 'Wataru Endo', position: 'CDM', xgWeight: 0.06 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ],
  'Tunisia': [
    { name: 'Wahbi Khazri', position: 'ST', xgWeight: 0.35 },
    { name: 'Youssef Msakni', position: 'AM', xgWeight: 0.25 },
    { name: 'Aissa Laidouni', position: 'CM', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.28 },
  ],
  'Sweden': [
    { name: 'Alexander Isak', position: 'ST', xgWeight: 0.38 },
    { name: 'Dejan Kulusevski', position: 'RW', xgWeight: 0.25 },
    { name: 'Viktor Gyokeres', position: 'ST', xgWeight: 0.18 },
    { name: 'Emil Forsberg', position: 'AM', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.11 },
  ],

  // ═══════════════ GROUP G ═══════════════
  'Belgium': [
    { name: 'Kevin De Bruyne', position: 'AM', xgWeight: 0.28 },
    { name: 'Romelu Lukaku', position: 'ST', xgWeight: 0.30 },
    { name: 'Jeremy Doku', position: 'LW', xgWeight: 0.15 },
    { name: 'Leandro Trossard', position: 'RW', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ],
  'Egypt': [
    { name: 'Mohamed Salah', position: 'RW', xgWeight: 0.45 },
    { name: 'Trezeguet', position: 'LW', xgWeight: 0.18 },
    { name: 'Omar Marmoush', position: 'ST', xgWeight: 0.15 },
    { name: 'Mohamed Elneny', position: 'CM', xgWeight: 0.07 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ],
  'Iran': [
    { name: 'Mehdi Taremi', position: 'ST', xgWeight: 0.40 },
    { name: 'Sardar Azmoun', position: 'ST', xgWeight: 0.25 },
    { name: 'Alireza Jahanbakhsh', position: 'RW', xgWeight: 0.15 },
    { name: 'Others', position: 'DEF', xgWeight: 0.20 },
  ],
  'New Zealand': [
    { name: 'Chris Wood', position: 'ST', xgWeight: 0.45 },
    { name: 'Sarpreet Singh', position: 'AM', xgWeight: 0.18 },
    { name: 'Matthew Garbett', position: 'CM', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.25 },
  ],

  // ═══════════════ GROUP H ═══════════════
  'Spain': [
    { name: 'Lamine Yamal', position: 'RW', xgWeight: 0.25 },
    { name: 'Alvaro Morata', position: 'ST', xgWeight: 0.22 },
    { name: 'Nico Williams', position: 'LW', xgWeight: 0.20 },
    { name: 'Pedri', position: 'CM', xgWeight: 0.12 },
    { name: 'Dani Olmo', position: 'AM', xgWeight: 0.10 },
    { name: 'Others', position: 'DEF', xgWeight: 0.11 },
  ],
  'Cape Verde': [
    { name: 'Garry Rodrigues', position: 'RW', xgWeight: 0.35 },
    { name: 'Ryan Mendes', position: 'LW', xgWeight: 0.25 },
    { name: 'Julio Tavares', position: 'ST', xgWeight: 0.20 },
    { name: 'Others', position: 'DEF', xgWeight: 0.20 },
  ],
  'Saudi Arabia': [
    { name: 'Salem Al-Dawsari', position: 'LW', xgWeight: 0.35 },
    { name: 'Firas Al-Buraikan', position: 'ST', xgWeight: 0.28 },
    { name: 'Saleh Al-Shehri', position: 'ST', xgWeight: 0.17 },
    { name: 'Others', position: 'DEF', xgWeight: 0.20 },
  ],
  'Uruguay': [
    { name: 'Darwin Nunez', position: 'ST', xgWeight: 0.32 },
    { name: 'Luis Suarez', position: 'ST', xgWeight: 0.22 },
    { name: 'Federico Valverde', position: 'CM', xgWeight: 0.18 },
    { name: 'Facundo Pellistri', position: 'RW', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.16 },
  ],

  // ═══════════════ GROUP I ═══════════════
  'France': [
    { name: 'Kylian Mbappe', position: 'LW', xgWeight: 0.35 },
    { name: 'Marcus Thuram', position: 'ST', xgWeight: 0.20 },
    { name: 'Antoine Griezmann', position: 'AM', xgWeight: 0.18 },
    { name: 'Ousmane Dembele', position: 'RW', xgWeight: 0.12 },
    { name: 'Aurelien Tchouameni', position: 'CDM', xgWeight: 0.05 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Senegal': [
    { name: 'Sadio Mane', position: 'LW', xgWeight: 0.35 },
    { name: 'Ismaila Sarr', position: 'RW', xgWeight: 0.22 },
    { name: 'Boulaye Dia', position: 'ST', xgWeight: 0.18 },
    { name: 'Idrissa Gueye', position: 'CM', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.17 },
  ],
  'Norway': [
    { name: 'Erling Haaland', position: 'ST', xgWeight: 0.48 },
    { name: 'Martin Odegaard', position: 'AM', xgWeight: 0.22 },
    { name: 'Alexander Sorloth', position: 'ST', xgWeight: 0.12 },
    { name: 'Sander Berge', position: 'CM', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Iraq': [
    { name: 'Mohanad Ali', position: 'ST', xgWeight: 0.38 },
    { name: 'Aymen Hussein', position: 'ST', xgWeight: 0.25 },
    { name: 'Ibrahim Bayesh', position: 'CM', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.25 },
  ],

  // ═══════════════ GROUP J ═══════════════
  'Argentina': [
    { name: 'Lionel Messi', position: 'RW', xgWeight: 0.30 },
    { name: 'Julian Alvarez', position: 'ST', xgWeight: 0.25 },
    { name: 'Lautaro Martinez', position: 'ST', xgWeight: 0.18 },
    { name: 'Angel Di Maria', position: 'RW', xgWeight: 0.10 },
    { name: 'Enzo Fernandez', position: 'CM', xgWeight: 0.07 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Algeria': [
    { name: 'Islam Slimani', position: 'ST', xgWeight: 0.30 },
    { name: 'Riyad Mahrez', position: 'RW', xgWeight: 0.28 },
    { name: 'Said Benrahma', position: 'LW', xgWeight: 0.18 },
    { name: 'Ismael Bennacer', position: 'CM', xgWeight: 0.10 },
    { name: 'Others', position: 'DEF', xgWeight: 0.14 },
  ],
  'Austria': [
    { name: 'Marko Arnautovic', position: 'ST', xgWeight: 0.30 },
    { name: 'Marcel Sabitzer', position: 'AM', xgWeight: 0.25 },
    { name: 'Christoph Baumgartner', position: 'AM', xgWeight: 0.18 },
    { name: 'Konrad Laimer', position: 'CM', xgWeight: 0.10 },
    { name: 'Others', position: 'DEF', xgWeight: 0.17 },
  ],
  'Jordan': [
    { name: 'Mousa Al-Taamari', position: 'AM', xgWeight: 0.35 },
    { name: 'Yazan Al-Naimat', position: 'ST', xgWeight: 0.28 },
    { name: 'Musa Al-Taamari', position: 'LW', xgWeight: 0.15 },
    { name: 'Others', position: 'DEF', xgWeight: 0.22 },
  ],

  // ═══════════════ GROUP K ═══════════════
  'Portugal': [
    { name: 'Cristiano Ronaldo', position: 'ST', xgWeight: 0.30 },
    { name: 'Rafael Leao', position: 'LW', xgWeight: 0.22 },
    { name: 'Bernardo Silva', position: 'AM', xgWeight: 0.18 },
    { name: 'Bruno Fernandes', position: 'AM', xgWeight: 0.15 },
    { name: 'Joao Felix', position: 'ST', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.07 },
  ],
  'Colombia': [
    { name: 'Luis Diaz', position: 'LW', xgWeight: 0.30 },
    { name: 'Rafael Santos Borre', position: 'ST', xgWeight: 0.22 },
    { name: 'James Rodriguez', position: 'AM', xgWeight: 0.18 },
    { name: 'Luis Sinisterra', position: 'RW', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.18 },
  ],
  'Uzbekistan': [
    { name: 'Eldor Shomurodov', position: 'ST', xgWeight: 0.40 },
    { name: 'Jaloliddin Masharipov', position: 'AM', xgWeight: 0.25 },
    { name: 'Oston Urunov', position: 'LW', xgWeight: 0.15 },
    { name: 'Others', position: 'DEF', xgWeight: 0.20 },
  ],
  'Congo DR': [
    { name: 'Cedric Bakambu', position: 'ST', xgWeight: 0.35 },
    { name: 'Yoane Wissa', position: 'ST', xgWeight: 0.25 },
    { name: 'Chancel Mbemba', position: 'CB', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.32 },
  ],
  'DR Congo': [
    { name: 'Cedric Bakambu', position: 'ST', xgWeight: 0.35 },
    { name: 'Yoane Wissa', position: 'ST', xgWeight: 0.25 },
    { name: 'Chancel Mbemba', position: 'CB', xgWeight: 0.08 },
    { name: 'Others', position: 'DEF', xgWeight: 0.32 },
  ],

  // ═══════════════ GROUP L ═══════════════
  'England': [
    { name: 'Harry Kane', position: 'ST', xgWeight: 0.32 },
    { name: 'Bukayo Saka', position: 'RW', xgWeight: 0.22 },
    { name: 'Phil Foden', position: 'LW', xgWeight: 0.18 },
    { name: 'Jude Bellingham', position: 'AM', xgWeight: 0.15 },
    { name: 'Declan Rice', position: 'CDM', xgWeight: 0.05 },
    { name: 'Others', position: 'DEF', xgWeight: 0.08 },
  ],
  'Croatia': [
    { name: 'Luka Modric', position: 'CM', xgWeight: 0.18 },
    { name: 'Andrej Kramaric', position: 'ST', xgWeight: 0.30 },
    { name: 'Ivan Perisic', position: 'LW', xgWeight: 0.20 },
    { name: 'Mateo Kovacic', position: 'CM', xgWeight: 0.10 },
    { name: 'Lovro Majer', position: 'AM', xgWeight: 0.12 },
    { name: 'Others', position: 'DEF', xgWeight: 0.10 },
  ],
  'Ghana': [
    { name: 'Mohammed Kudus', position: 'AM', xgWeight: 0.35 },
    { name: 'Jordan Ayew', position: 'ST', xgWeight: 0.22 },
    { name: 'Inaki Williams', position: 'RW', xgWeight: 0.18 },
    { name: 'Thomas Partey', position: 'CM', xgWeight: 0.10 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ],
  'Panama': [
    { name: 'Jose Fajardo', position: 'ST', xgWeight: 0.35 },
    { name: 'Edgar Barcenas', position: 'RW', xgWeight: 0.22 },
    { name: 'Adalberto Carrasquilla', position: 'CM', xgWeight: 0.15 },
    { name: 'Others', position: 'DEF', xgWeight: 0.28 },
  ],
};

// Also add common alternative name mappings
const NAME_ALIASES = {
  'Bosnia': 'Bosnia and Herzegovina',
  'Cote d\'Ivoire': 'Ivory Coast',
  'Korea Republic': 'South Korea',
  'Türkiye': 'Turkiye',
  'Turkey': 'Turkiye',
  'Curaçao': 'Curacao',
};

/**
 * Gets the starting lineup and xG allocations for a team.
 * Supports alternative team name spellings.
 */
export function getTeamLineup(teamName) {
  // Direct lookup
  if (SQUADS[teamName]) return SQUADS[teamName];
  // Alias lookup
  const alias = NAME_ALIASES[teamName];
  if (alias && SQUADS[alias]) return SQUADS[alias];
  // Fallback
  return [
    { name: 'Striker', position: 'ST', xgWeight: 0.38 },
    { name: 'Winger', position: 'LW', xgWeight: 0.22 },
    { name: 'Attacking Mid', position: 'AM', xgWeight: 0.15 },
    { name: 'Midfielder', position: 'CM', xgWeight: 0.10 },
    { name: 'Others', position: 'DEF', xgWeight: 0.15 },
  ];
}

/**
 * Calculates the Anytime Goalscorer probability for a specific player.
 * Uses Poisson: P(Player Scores >= 1) = 1 - e^(-playerXG)
 */
export function calculatePlayerGoalProb(teamTotalXG, playerXGWeight) {
  const playerXG = teamTotalXG * playerXGWeight;
  return 1 - Math.exp(-playerXG);
}
