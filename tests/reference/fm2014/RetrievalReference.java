// FM4 verification harness, not recovered or upstream source. Uses only synthetic matrices.
import java.util.*;
import org.knowceans.dirichlet.lda.LdaTopicSimilarities;
import org.knowceans.map.IndexRanking;
import org.knowceans.map.IndexRanking.IndexEntry;

public class RetrievalReference extends LdaTopicSimilarities {
    static final double[][] PHI={{.6,.2,.1,.1},{.1,.6,.2,.1},{.1,.1,.3,.5}};
    static final double[][] THETA={{.7,.2,.1},{.1,.7,.2},{.1,.2,.7},{.4,.4,.2}};
    static final double[] QUERY={.6,.3,.1};
    RetrievalReference(){
        super();phi=PHI;theta=THETA;phiPost=posterior(phi);thetaPost=posterior(theta);
    }
    static String entries(IndexRanking ranking){
        StringJoiner rows=new StringJoiner(",","[","]");
        for(IndexEntry entry:ranking.entryList())rows.add("{\"index\":"+entry.getIndex()+",\"value\":"+entry.getScore()+"}");
        return rows.toString();
    }
    public static void main(String[] args){
        RetrievalReference r=new RetrievalReference();
        System.out.print("{\"phi\":"+Arrays.deepToString(PHI)+",\"theta\":"+Arrays.deepToString(THETA)+",\"query\":"+Arrays.toString(QUERY)
            +",\"posteriorTheta\":"+Arrays.deepToString(posterior(THETA))
            +",\"queryDocsDistance\":"+entries(r.queryDocs(QUERY,false,10))
            +",\"queryDocsPredictive\":"+entries(r.queryDocs(QUERY,true,10))
            +",\"queryTermsDistance\":"+entries(r.queryTerms(QUERY,false,10))
            +",\"queryTermsPredictive\":"+entries(r.queryTerms(QUERY,true,10))
            +",\"docDocsDistance\":"+entries(r.docDocs(0,false,10))
            +",\"docTermsDistance\":"+entries(r.docTerms(0,false,10))
            +",\"termDocsDistance\":"+entries(r.termDocs(0,false,10))
            +",\"termTermsDistance\":"+entries(r.termTerms(0,false,10))+"}");
    }
}
