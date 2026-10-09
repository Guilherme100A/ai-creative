#!/bin/bash
# farm.sh — mantém o farm_loop.js vivo a noite toda.
#  0 = acabou a novidade → para · 10 = teto da noite → para
# 11 = mcp-media respondeu bloqueio:true → espera 45 min sem nenhum pedido e tenta de novo (até 8 vezes)
#  outro = erro → espera 2 min e religa (até 20 vezes); o vigia (agente no Maestri) corrige o código e a próxima religada pega a correção.
P=/c/Users/green/Downloads/criativo/criativo/pipeline; L=/c/Users/green/Downloads/criativo/_cacador_saida/logs/farm.log
cd $P; quedas=0; bloqs=0
while :; do
 node farm_loop.js "$@"; c=$?; h=$(date '+%d/%m %H:%M')
 [ $c -eq 0 ] && { echo "$h [farm.sh] terminou (sem novidade)" >> $L; break; }
 [ $c -eq 10 ] && { echo "$h [farm.sh] parado (teto da noite)" >> $L; break; }
 if [ $c -eq 11 ]; then bloqs=$((bloqs+1)); [ $bloqs -gt 8 ] && { echo "$h [farm.sh] bloqueado 8 vezes — parei de vez" >> $L; break; }
  echo "$h [farm.sh] bloqueio $bloqs/8 — espero 45 min" >> $L; sleep 2700; continue; fi
 quedas=$((quedas+1)); echo "$h [farm.sh] caiu (código $c), queda $quedas/20 — religo em 2 min" >> $L
 [ $quedas -ge 20 ] && { echo "$h [farm.sh] 20 quedas — desisti" >> $L; break; }
 sleep 120
done
