package com.inko.pricing.service;
import com.inko.pricing.domain.SidesMode;
public final class PrintCalc {
    private PrintCalc(){}
    public static int printedPages(int selectedPageCount, int copies){ return selectedPageCount * Math.max(1,copies); }
    public static int physicalSheets(int selectedPageCount, int copies, SidesMode sides){
        int pp = printedPages(selectedPageCount, copies);
        return sides==SidesMode.DOUBLE ? (pp+1)/2 : pp;
    }
    public static int physicalSheets(int selectedPageCount, int copies, String sidesStr){
        SidesMode s; try{ s=SidesMode.valueOf(sidesStr);}catch(Exception e){ s=SidesMode.SINGLE; }
        return physicalSheets(selectedPageCount,copies,s);
    }
    public static int parsePageCount(String sel, int total){
        if(sel==null||sel.isBlank()||sel.equalsIgnoreCase("ALL")) return total;
        int c=0; for(String part: sel.split(",")){ part=part.trim(); if(part.isEmpty()) continue;
            if(part.contains("-")){ String[] b=part.split("-"); try{ int a=Integer.parseInt(b[0].trim()); int bb=Integer.parseInt(b[1].trim()); if(bb>=a) c+=bb-a+1; else c+=1; }catch(Exception e){ c+=1; }}
            else { try{ Integer.parseInt(part); c+=1; }catch(Exception e){}}
        } return Math.min(Math.max(0,c), total);
    }
}
